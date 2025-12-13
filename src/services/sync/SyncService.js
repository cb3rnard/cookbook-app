import { DebugService } from "../DebugService";
import { ConnectionStore } from "../stores/ConnectionStore";
import { DataStore } from "../stores/DataStore";
import { SessionStore } from "../stores/SessionStore";
import { SyncStore } from "../stores/SyncStore";
import { EventBus } from "../utils/EventBus";
import { delayExecution } from "../utils/GlobalUtils";
import { SyncConflictsService } from "./SyncConflictsService";
import { SyncExporter } from "./SyncExporter";
import { SyncImporter } from "./SyncImporter";

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
    this.dataStore = new DataStore();
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
    const { endpoint, uuid, isDirty = false, remoteOnly, callback } = data;
    DebugService.log(
      ["SyncService: entity sync requested", { endpoint, uuid, isDirty }],
      "sync",
    );

    try {
      // Ends if not authenticated
      if (!this.connectionStore.authenticated) {
        callback(null);
        return;
      }

      // Check if entity needs sync (dirty locally OR dirty on remote)
      const remoteDirtyVersions = this.dataStore.state.remoteDirtyVersions;
      const isDirtyOnRemote = remoteDirtyVersions.has(uuid);

      // Early exit if remote only and not dirty on remote
      if (remoteOnly && !isDirtyOnRemote) {
        callback(null);
        return;
      }

      const needsSync = isDirty || (isDirtyOnRemote && remoteOnly);
      if (!needsSync) {
        callback(null);
        return;
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

    try {
      this.syncStore.startOperation(
        incremental ? "incrementalSync" : "fullSync",
      );

      // Sync dependencies first, then recipes
      const endpoints = ["types", "ingredients", "recipes"];

      for (const endpoint of endpoints) {
        this.syncStore.updateOperation(endpoint, "Synchronisation");
        await this._syncEndpoint(
          this.repositories.get(endpoint),
          conflictStrategy,
          delay,
          incremental,
        );
      }

      const syncSuccess = this.syncStore.finishOperation();
      if (syncSuccess) {
        this.sessionStore.setLastSyncDate(new Date());
      }

      this.eventBus.emit(
        incremental ? "incrementalSync:completed" : "fullSync:completed",
      );
    } catch (error) {
      console.error("Sync failed:", error);
      this.syncStore.addOperationError(error.message);
      this.syncStore.finishOperation();
      this._emitSyncEvent("error", error);
      throw error;
    }
  }

  /**
   * Synchronises a single entity by UUID
   * @private
   * @param {string} endpoint - Entity endpoint
   * @param {string} entityUuid - Entity UUID
   * @param {string} conflictStrategy - Conflict resolution strategy
   * @returns {Promise<Object>} The synced entity
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
      this.syncStore.finishOperation();

      return syncedEntity;
    } catch (error) {
      this.syncStore.addOperationError(error.message);
      this.syncStore.finishOperation();
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
    const endpoint = repository.endpoint;

    try {
      let localEntities, remoteEntities;

      // Fetch local entities
      try {
        if (incremental) {
          localEntities = await repository.getDirty(
            {},
            { withAll: true, construct: true },
          );
        } else {
          localEntities = await repository.getAll(
            {},
            { withAll: true, construct: true },
          );
        }
      } catch (error) {
        // Critical: Can't read local data
        console.error(`Critical error fetching local ${endpoint}:`, error);
        this.syncStore.setEndpointCriticalError(
          endpoint,
          `Failed to fetch local data: ${error.message}`,
        );
        this.syncStore.addOperationError(
          `${endpoint}: Failed to fetch local data`,
        );
        return; // Skip this endpoint, continue with next
      }

      // Fetch remote entities
      try {
        if (incremental) {
          remoteEntities =
            await this.apiService.operations.entity.getAllSince(endpoint);

          // Filter out already synced entities to avoid re-importing
          // An entity is already synced if local lastSyncDate >= remote dateReceived
          const filteredRemoteEntities = [];
          for (const remoteEntity of remoteEntities) {
            const isSynced = await repository.isSynced(
              remoteEntity.uuid,
              remoteEntity.dateReceived,
            );
            if (!isSynced) {
              filteredRemoteEntities.push(remoteEntity);
            }
          }
          remoteEntities = filteredRemoteEntities;
        } else {
          remoteEntities =
            await this.apiService.operations.entity.getAll(endpoint);
        }
      } catch (error) {
        // Critical: API unavailable or network error
        console.error(`Critical error fetching remote ${endpoint}:`, error);
        this.syncStore.setEndpointCriticalError(
          endpoint,
          `Failed to fetch remote data: ${error.message}`,
        );
        this.syncStore.addOperationError(
          `${endpoint}: Failed to fetch remote data`,
        );
        return; // Skip this endpoint, continue with next
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

      // Set counts and conflicts in SyncStore
      this.syncStore.setEndpointCounts(
        endpoint,
        resolution.toLocal.length,
        resolution.toRemote.length,
      );

      this.syncStore.setEndpointConflicts(endpoint, resolution.conflicts || []);

      try {
        await this._syncResolution(repository, resolution, delay);
      } catch (error) {
        // Error during import/export, already handled by SyncImporter/SyncExporter
        console.error(`Error during sync resolution for ${endpoint}:`, error);
        this.syncStore.addOperationError(`${endpoint}: ${error.message}`);
        // Continue with next endpoint
      }
    } catch (error) {
      // Unexpected error
      console.error(`Unexpected error syncing ${endpoint}:`, error);
      this.syncStore.setEndpointCriticalError(
        endpoint,
        `Unexpected error: ${error.message}`,
      );
      this.syncStore.addOperationError(`${endpoint}: Unexpected error`);
    }
  }

  async _syncResolution(repository, resolution, delay) {
    const endpoint = repository.endpoint;

    await delayExecution(delay);

    // Import remote entities
    this.syncStore.updateOperation(endpoint, "Import");
    const syncImporter = new SyncImporter(endpoint, resolution.toLocal, this);
    await syncImporter.import();

    await delayExecution(delay);

    // Export local entities
    this.syncStore.updateOperation(endpoint, "Export");
    const syncExporter = new SyncExporter(endpoint, resolution.toRemote, this);
    await syncExporter.export();

    await delayExecution(delay);
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
