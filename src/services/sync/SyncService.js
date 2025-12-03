import { DebugService } from "../DebugService";
import { ConnectionStore } from "../stores/ConnectionStore";
import { SessionStore } from "../stores/SessionStore";
import { SyncStore } from "../stores/SyncStore";
import { EventBus } from "../utils/EventBus";
import { delayExecution } from "../utils/GlobalUtils";
import { SyncConflictsService } from "./SyncConflictsService";
import { SyncExporter } from "./SyncExporter";
import { SyncImporter } from "./SyncImporter";

const entitiesSyncResultModel = {
  success: 0,
  failed: 0,
  errors: [],
};

const endpointSyncResultsModel = {
  import: { ...entitiesSyncResultModel },
  export: { ...entitiesSyncResultModel },
};

const initialFullSyncResults = {
  recipes: { ...endpointSyncResultsModel },
  ingredients: { ...endpointSyncResultsModel },
  types: { ...endpointSyncResultsModel },
  totalFailed: 0,
  totalImported: 0,
  totalErrors: 0,
  errors: [],
  allFailed: false,
  success: false,
  error: null,
};

export class SyncService {
  /**
   * @param {Object} repositories - Map des repositories injectés depuis DataService
   */
  constructor(repositories, apiService) {
    if (SyncService._instance) {
      return SyncService._instance;
    }
    this.apiService = apiService;
    this.repositories = repositories;
    this.eventBus = EventBus.getInstance();
    this.connectionStore = new ConnectionStore();
    this.sessionStore = new SessionStore();
    this.syncStore = new SyncStore();
    this._setupListeners();
    SyncService._instance = this;
  }

  _setupListeners() {
    this.eventBus.on("sync:request:entity", async (data) => {
      await this._syncRequestEntityListener(data);
    });
    this.eventBus.on("sync:request:imageBinary", async (data) => {
      await this._syncRequestImageBinaryListener(data);
    });
  }

  /**
   * Entity sync request listener
   */
  async _syncRequestEntityListener(data) {
    const { endpoint, uuid, callback } = data;
    DebugService.log(
      ["SyncService: entity sync requested", { endpoint, uuid }],
      "sync",
    );

    try {
      // Ends if not authenticated
      if (!this.connectionStore.authenticated) {
        return null;
      }
      const syncedEntity = await this._syncEntity(endpoint, uuid);
      callback(syncedEntity);
    } catch (error) {
      console.error("Entity sync failed:", error);
      callback(null);
    }
  }

  /**
   * Image binary sync request listener
   */
  async _syncRequestImageBinaryListener(data) {
    const { uuid, callback } = data;

    if (!this.connectionStore.authenticated) {
      callback({ status: "error", error: "Not authenticated" });
      return;
    }

    const result = await this.fetchRemoteImageData(uuid);
    callback(result);
  }

  /**
   * Émet un événement de synchronisation
   * @private
   */
  _emitSyncEvent(action, data = {}) {
    this.eventBus.emit(`sync:${action}`, data);
  }

  // ==================== SYNC OPERATIONS ====================

  /**
   * Synchronisation complète bidirectionnelle
   * @param {number} delay - Délai entre opérations
   * @param {string} conflictStrategy - Stratégie de résolution des conflits
   * @param {boolean} incremental - Sync incrémentale ou complète
   * @returns {Promise<Object>} Résultats de la synchronisation
   */
  async sync(
    delay = 0,
    conflictStrategy = "LAST_WRITE_WINS",
    incremental = false,
  ) {
    if (!this.connectionStore.authenticated) {
      console.warn("SyncService: sync aborted - not authenticated");
      return;
    }
    const results = { ...initialFullSyncResults };
    try {
      this.syncStore.startOperation(
        incremental ? "incrementalSync" : "fullSync",
      );

      // Sync dependencies first, then recipes
      const endpoints = ["types", "ingredients", "recipes"];

      for (const endpoint of endpoints) {
        this.syncStore.updateOperation(endpoint, "Synchronisation");
        const endpointSyncResults = await this._syncEndpoint(
          this.repositories.get(endpoint),
          conflictStrategy,
          delay,
          incremental,
        );
        results[endpoint] = endpointSyncResults;
        results.totalErrors +=
          endpointSyncResults.import.errors.length +
          endpointSyncResults.export.errors.length;
        results.totalFailed +=
          endpointSyncResults.import.failed + endpointSyncResults.export.failed;
        results.totalSuccess +=
          endpointSyncResults.import.success +
          endpointSyncResults.export.success;
      }

      results.allFailed = results.totalFailed > 0 && results.totalSuccess === 0;
      results.success = results.totalFailed === 0;

      if (results.success) {
        this.sessionStore.setLastSyncDate(new Date());
      }

      this.syncStore.finishOperation(true, results);
      this._emitSyncEvent("completed", results);
      this.eventBus.emit(
        incremental ? "incrementalSync:completed" : "fullSync:completed",
        results,
      );
      // await this.getCountsAndDirty();
      return results;
    } catch (error) {
      console.error("Sync failed:", error);
      results.success = false;
      results.error = error.message;
      this.syncStore.finishOperation(false, results);
      this.syncStore.addOperationError(error);

      this._emitSyncEvent("error", error);
      throw error;
    }
  }

  /**
   * Synchronise une entité spécifique (utilisée par EventBus et méthodes internes)
   * @param {string} endpoint - Type d'entité (recipes, ingredients, etc.)
   * @param {string} uuid - UUID de l'entité
   * @param {object} options - Options incluant hydrate, conflictStrategy, etc.
   * @returns {Promise<object>} L'entité synchronisée
   */
  async _syncEntity(
    endpoint,
    entityUuid,
    conflictStrategy = "LAST_WRITE_WINS",
  ) {
    const results = {
      imported: 0,
      exported: 0,
      failedImported: 0,
      failedExported: 0,
      conflicts: 0,
      errors: [],
    };

    try {
      const repository = this.repositories.get(endpoint);

      // Gets full entity with all relations
      const localEntity = await repository.get(
        entityUuid,
        { withAll: true, construct: true },
        false,
      );

      // Gets remote entity modified since last local sync
      const since = localEntity?.lastSyncDate || null;
      let remoteModifiedEntity = null;

      try {
        // For recipes, use the endpoint with dependencies
        if (endpoint === "recipes") {
          remoteModifiedEntity =
            await this.apiService.operations.recipe.getRecipeWithDependencies(
              entityUuid,
              since,
            );
        } else {
          remoteModifiedEntity = await this.apiService.operations.entity.get(
            endpoint,
            entityUuid,
            since,
          );
        }
      } catch (error) {
        remoteModifiedEntity = null;
      }

      // If neither remote nor local entity doesn't exists
      if (!remoteModifiedEntity && !localEntity) {
        return null;
      }

      this.syncStore.startOperation("syncEntity");

      // Résolution de conflits
      const resolution = SyncConflictsService.detectConflicts(
        endpoint,
        localEntity ? [localEntity] : [],
        remoteModifiedEntity ? [remoteModifiedEntity] : [],
        conflictStrategy,
      );

      const syncResults = await this._syncResolution(repository, resolution, 0);
      const syncedEntity = await repository.get(
        entityUuid,
        { withAll: true, construct: true },
        false,
      );
      this.syncStore.finishOperation(true, syncResults);

      return syncedEntity;
    } catch (error) {
      results.error = error.message;
      this.syncStore.addOperationError(error);
      this.syncStore.finishOperation(false, results);
      this._emitSyncEvent("error", error);
      throw error;
    }
  }

  // ==================== PRIVATE SYNC METHODS ====================

  /**
   * Synchronises an endpoint (entity type)
   * @private
   * @param {string} repository - Repository de l'entité
   * @param {number} conflictStrategy - Stratégie de résolution des conflits
   * @param {number} delay - Délai entre les opérations
   * @param {boolean} incremental - Indique si la sync est incrémentale
   * @returns {Promise<Object>} Résultats de la synchronisation
   */
  async _syncEndpoint(
    repository,
    conflictStrategy = 0,
    delay,
    incremental = false,
  ) {
    const results = { ...endpointSyncResultsModel };
    const endpoint = repository.endpoint;

    try {
      let localEntities, remoteEntities;
      if (incremental) {
        localEntities = await repository.getDirty(
          {},
          { withAll: true, construct: true },
        );
        remoteEntities =
          await this.apiService.operations.entity.getAllSince(endpoint);
      } else {
        localEntities = await repository.getAll(
          {},
          { withAll: true, construct: true },
        );
        remoteEntities =
          await this.apiService.operations.entity.getAll(endpoint);
      }

      this.syncStore.updateOperation(
        endpoint,
        "Détection et résolution des conflits",
      );
      const resolution = SyncConflictsService.detectConflicts(
        endpoint,
        localEntities,
        remoteEntities,
        conflictStrategy,
      );

      return await this._syncResolution(repository, resolution, delay);
    } catch (error) {
      console.error(`Error syncing entity type ${endpoint}:`, error);
      results.errors.push(`Sync failed for ${endpoint}: ${error.message}`);
      this.syncStore.addOperationError(
        `Sync failed for ${endpoint}: ${error.message}`,
      );
      return results;
    }
  }

  async _syncResolution(repository, resolution, delay) {
    const results = { ...endpointSyncResultsModel };
    const endpoint = repository.endpoint;

    await delayExecution(delay);

    // Import remote entities
    this.syncStore.updateOperation(endpoint, "Import");

    const syncImporter = new SyncImporter(endpoint, resolution.toLocal, this);
    results.import = await syncImporter.import();

    await delayExecution(delay);

    // Export local entities
    this.syncStore.updateOperation(endpoint, "Export");
    const syncExporter = new SyncExporter(endpoint, resolution.toRemote, this);
    results.export = await syncExporter.export();

    await delayExecution(delay);

    return results;
  }

  /**
   * Fetches remote image data with proper error handling
   * @private
   * @param {string} imageUuid - Image UUID
   * @returns {Promise<Object>} Result object with status and data/error
   */
  async fetchRemoteImageData(imageUuid) {
    if (imageUuid == null) {
      return { status: "error", error: "No UUID provided" };
    }

    try {
      const response =
        await this.apiService.operations.image.getImageBinary(imageUuid);

      // Image not found on server
      if (response.status === 404) {
        return { status: "not_found", error: "Image not found on server" };
      }

      // Other HTTP errors
      if (!response.ok) {
        return {
          status: "error",
          error: `Server error: ${response.status}`,
          httpStatus: response.status,
        };
      }

      const imageBlob = await response.blob();

      return {
        status: "success",
        data: {
          uuid: imageUuid,
          blob: imageBlob,
          size: imageBlob.size,
          mimeType: imageBlob.type,
        },
      };
    } catch (error) {
      // Network error or server unavailable
      return {
        status: "error",
        error: error.message,
        networkError: true,
      };
    }
  }
}
