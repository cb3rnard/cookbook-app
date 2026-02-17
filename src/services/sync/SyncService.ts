import {
  config,
  ConflictStrategy,
  EndpointSyncable,
} from '@src/config/config.ts';
import {
  EntitySyncable,
  ImageData,
  RecipeData,
  RecipeMainDependenciesEndpoint,
  RecipeMainDependenciesEntity,
} from '@src/types/entities.ts';
import { RepositoriesMap, SyncRepository } from '@src/types/repositories.ts';
import { SyncConflictResolution } from '@src/types/sync.ts';
import { ApiService } from '../api/ApiService.js';
import { DebugService } from '../DebugService.js';
import { ConnectionStore } from '../stores/ConnectionStore.js';
import { DataStore } from '../stores/DataStore.js';
import { SessionStore } from '../stores/SessionStore.js';
import { SyncStore } from '../stores/SyncStore.ts';
import { EventBus, EventPayloads } from '../utils/EventBus.ts';
import { delayExecution, getErrorMessage } from '../utils/GlobalUtils.js';
import { SyncConflictsService } from './SyncConflictsService.js';
import { SyncExporter } from './SyncExporter.js';
import { SyncImporter } from './SyncImporter.js';

export type SyncAction = 'import' | 'export' | 'error' | 'imported';

export class SyncService {
  static _instance: SyncService | null = null;
  syncStore!: SyncStore;
  dataStore!: DataStore;
  connectionStore!: ConnectionStore;
  sessionStore!: SessionStore;
  eventBus!: EventBus;
  apiService!: ApiService;
  repositories!: RepositoriesMap;
  /**
   * @param {Object} repositories - Map des repositories injectés depuis DataService
   */
  constructor(
    repositories = new Map() as RepositoriesMap,
    apiService?: ApiService,
  ) {
    if (SyncService._instance) {
      return SyncService._instance;
    }
    this.apiService = apiService || new ApiService();
    this.repositories = repositories;
    this.eventBus = EventBus.getInstance();
    this.connectionStore = new ConnectionStore();
    this.sessionStore = this.apiService.sessionStore;
    this.syncStore = new SyncStore();
    this.dataStore = new DataStore();
    this._setupListeners();
    SyncService._instance = this;
  }

  _setupListeners() {
    this.eventBus.on('sync:request:entity', async (data) => {
      await this._syncRequestEntityListener(data);
    });
    this.eventBus.on('sync:request:imageBinary', async (data) => {
      await this._syncRequestImageBinaryListener(data);
    });
  }

  /**
   * Entity sync request listener
   */
  async _syncRequestEntityListener(
    data: EventPayloads['sync:request:entity'],
  ): Promise<void> {
    const { endpoint, uuid, isDirty = false, remoteOnly, callback } = data;
    DebugService.log('sync', 'SyncService: entity sync requested', {
      endpoint,
      uuid,
      isDirty,
    });

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
      console.error('Entity sync failed:', error);
      callback(null);
    }
  }

  /**
   * Image binary sync request listener
   */
  async _syncRequestImageBinaryListener(
    data: EventPayloads['sync:request:imageBinary'],
  ): Promise<void> {
    const { uuid, callback } = data;

    if (!this.connectionStore.authenticated) {
      callback({ status: 'error', error: 'Not authenticated' });
      return;
    }

    const result = await this.fetchRemoteImageData(uuid);
    callback(result);
  }

  /**
   * Émet un événement de synchronisation
   * @private
   */
  _emitSyncEvent(
    action: SyncAction,
    data: EventPayloads[keyof EventPayloads] = {},
  ): void {
    this.eventBus.emit(`sync:${action}`, data);
  }

  // ==================== SYNC OPERATIONS ====================

  /**
   * Synchronisation complète bidirectionnelle
   * @param {number} delay - Délai entre opérations
   * @param {ConflictStrategy} conflictStrategy - Stratégie de résolution des conflits
   * @param {boolean} incremental - Sync incrémentale ou complète
   * @returns {Promise<void>} Résultats de la synchronisation
   */
  async sync(
    delay = 0,
    conflictStrategy: ConflictStrategy = 'LAST_WRITE_WINS',
    incremental = false,
  ): Promise<void> {
    if (!this.connectionStore.authenticated) {
      console.warn('SyncService: sync aborted - not authenticated');
      return;
    }

    try {
      this.syncStore.startOperation(
        incremental ? 'incrementalSync' : 'fullSync',
      );

      // Sync dependencies first, then recipes
      const endpoints = config.ENDPOINTS_SYNCABLE;

      for (const endpoint of endpoints) {
        this.syncStore.updateOperation(endpoint, 'Synchronisation');
        const repository = this.repositories.get(endpoint)!;
        await this._syncEndpoint(
          repository,
          conflictStrategy,
          delay,
          incremental,
        );
      }

      const syncSuccess = this.syncStore.finishOperation();
      if (syncSuccess) {
        this.sessionStore.setLastSyncDate();
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error('Sync failed:', error);
      this.syncStore.addOperationError(errorMessage);
      this.syncStore.finishOperation();
      this._emitSyncEvent(
        'error',
        error instanceof Error ? { error } : { error: new Error(errorMessage) },
      );
      throw error;
    }
  }

  /**
   * Synchronises a single entity by UUID
   * @private
   * @param {string} endpoint
   * @param {string} entityUuid
   * @param {ConflictStrategy} conflictStrategy
   * @returns {Promise<Object>}
   */
  async _syncEntity(
    endpoint: EndpointSyncable,
    entityUuid: string,
    conflictStrategy: ConflictStrategy = 'LAST_WRITE_WINS',
  ): Promise<EntitySyncable | null> {
    try {
      if (!this.apiService)
        throw new Error('API Service not initialized in SyncService');

      const repository = this.repositories.get(endpoint);
      if (!repository)
        throw new Error(`Repository not found for endpoint: ${endpoint}`);

      // Gets full entity with all relations
      const localEntity = await repository.get(
        entityUuid,
        { complete: true },
        false,
      );

      // For recipes, sync dependencies (ingredients, types) first if they are dirty
      if (localEntity) {
        await this._syncRecipeDependencies(localEntity as RecipeData);
      }

      // Gets remote entity modified since last local sync
      const since = localEntity?.lastSyncDate || '';
      let remoteModifiedEntity = null;

      try {
        // For recipes, use the endpoint with dependencies
        if (endpoint === 'recipes') {
          remoteModifiedEntity =
            await this.apiService.operations.recipe.getRecipeWithDependencies(
              entityUuid,
              since,
            );
        } else {
          remoteModifiedEntity = await this.apiService.operations.entity.get(
            endpoint as EndpointSyncable,
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

      this.syncStore.startOperation('syncEntity');

      // Résolution de conflits
      const resolution = SyncConflictsService.detectConflicts(
        endpoint as EndpointSyncable,
        localEntity ? [localEntity] : [],
        remoteModifiedEntity ? [remoteModifiedEntity] : [],
        conflictStrategy,
      );

      // Sync d'une entité spécifique: bulkSync = false pour hydrater les entités liées
      await this._syncResolution(repository, resolution, 0, false);
      const syncedEntity = await repository.get(
        entityUuid,
        { complete: true },
        false,
      );
      this.syncStore.finishOperation();

      return syncedEntity;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      this.syncStore.addOperationError(errorMessage);
      this.syncStore.finishOperation();
      this._emitSyncEvent(
        'error',
        error instanceof Error ? { error } : { error: new Error(errorMessage) },
      );
      throw error;
    }
  }

  /**
   * Synchronizes recipe dependencies (ingredients and types) that are dirty
   */
  async _syncRecipeDependencies(recipeData: RecipeData): Promise<void> {
    const dependenciesToSync = new Map<
      RecipeMainDependenciesEndpoint,
      RecipeMainDependenciesEntity[]
    >();

    // Collect all dirty dependencies grouped by endpoint
    for (const endpoint of config.RECIPES_MAIN_DEPENDENCIES) {
      if (Array.isArray(recipeData[endpoint])) {
        for (const relation of recipeData[endpoint]) {
          const relationUuidKey =
            endpoint === 'ingredients'
              ? ('ingredientUuid' as keyof typeof relation)
              : ('typeUuid' as keyof typeof relation);
          const relationUuid = relation[relationUuidKey];
          if (!relationUuid) continue;

          const repository = this.repositories.get(endpoint);
          if (!repository) continue;

          const entityData = await repository.get(relationUuid, {}, false);

          if (entityData && entityData.isDirty !== 0) {
            if (!dependenciesToSync.has(endpoint)) {
              dependenciesToSync.set(endpoint, []);
            }
            // Avoid duplicates
            const existing = dependenciesToSync
              .get(endpoint)!
              .find((e) => e.uuid === entityData.uuid);
            if (!existing) {
              dependenciesToSync
                .get(endpoint)!
                .push(entityData as RecipeMainDependenciesEntity);
            }
          }
        }
      }
    }

    // Batch sync dependencies in correct order: types first, then ingredients
    const syncOrder = config.RECIPES_MAIN_DEPENDENCIES;

    for (const endpoint of syncOrder) {
      const entities = dependenciesToSync.get(endpoint);
      if (!entities || entities.length === 0) continue;

      const repository = this.repositories.get(endpoint);
      if (!repository) continue;

      DebugService.log(
        'sync',
        `SyncService: batch syncing ${entities.length} dirty ${endpoint} before recipe`,
        entities.map((e) => e.uuid),
      );

      try {
        // Create conflict resolution: export dirty dependencies (no import needed)
        const resolution: SyncConflictResolution = {
          toLocal: [], // No import for dependency sync
          toRemote: entities, // Export all dirty dependencies in batch
          conflicts: [],
        };

        // Sync all dirty dependencies for this endpoint in one batch
        // bulkSync: true because dependencies are independent entities, not complete with relations
        await this._syncResolution(repository, resolution, 0, true);
      } catch (error) {
        console.warn(
          `Failed to batch sync ${endpoint} dependencies before recipe:`,
          error,
        );
        // Continue with next endpoint even if this one fails
      }
    }
  }

  /**
   * Fully synchronises an syncable endpoint (recipes, ingredients, types)
   */
  async _syncEndpoint(
    repository: SyncRepository,
    conflictStrategy: ConflictStrategy = 'LAST_WRITE_WINS',
    delay = 0,
    incremental = false,
  ): Promise<void> {
    const endpoint = repository.endpoint;

    try {
      let localEntitiesData;
      let localEntities = [],
        remoteEntities = [];

      // Fetch local entities
      try {
        if (incremental) {
          localEntitiesData = await repository.getDirty(
            {},
            { complete: true, hydrateDependencies: '' },
          );
        } else {
          localEntitiesData = await repository.getAll(
            {},
            { complete: true, hydrateDependencies: '' },
          );
        }
        localEntities = localEntitiesData.map((data) =>
          repository.constructEntity(data),
        );
      } catch (error) {
        // Critical: Can't read local data
        console.error(`Critical error fetching local ${endpoint}:`, error);
        const errorMessage = getErrorMessage(error);
        this.syncStore.setEndpointCriticalError(
          endpoint,
          `Failed to fetch local data: ${errorMessage}`,
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
        const errorMessage = getErrorMessage(error);
        this.syncStore.setEndpointCriticalError(
          endpoint,
          `Failed to fetch remote data: ${errorMessage}`,
        );
        this.syncStore.addOperationError(
          `${endpoint}: Failed to fetch remote data`,
        );
        return; // Skip this endpoint, continue with next
      }

      this.syncStore.updateOperation(
        endpoint,
        'Détection et résolution des conflits',
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
        const errorMessage = getErrorMessage(error);
        this.syncStore.addOperationError(`${endpoint}: ${errorMessage}`);
        // Continue with next endpoint
      }
    } catch (error) {
      // Unexpected error
      console.error(`Unexpected error syncing ${endpoint}:`, error);
      const errorMessage = getErrorMessage(error);
      this.syncStore.setEndpointCriticalError(
        endpoint,
        `Unexpected error: ${errorMessage}`,
      );
      this.syncStore.addOperationError(`${endpoint}: Unexpected error`);
    }
  }

  async _syncResolution(
    repository: SyncRepository,
    resolution: SyncConflictResolution,
    delay = 0,
    bulkSync = true,
  ): Promise<void> {
    const endpoint = repository.endpoint;

    await delayExecution(delay);

    // Import remote entities
    this.syncStore.updateOperation(endpoint, 'Import');
    const syncImporter = new SyncImporter(endpoint, resolution.toLocal, this);
    await syncImporter.import();

    await delayExecution(delay);

    // Export local entities
    this.syncStore.updateOperation(endpoint, 'Export');
    const syncExporter = new SyncExporter(
      endpoint,
      resolution.toRemote,
      this,
      bulkSync,
    );
    await syncExporter.export();

    await delayExecution(delay);
  }

  /**
   * Fetches remote image data with proper error handling
   * @private
   * @param {string} imageUuid - Image UUID
   * @returns {Promise<Object>} Result object with status and data/error
   */
  async fetchRemoteImageData(imageUuid: string): Promise<{
    status: 'success' | 'error' | 'not_found';
    data?: ImageData;
    error?: string;
    httpStatus?: number;
    networkError?: boolean;
  }> {
    if (imageUuid == null) {
      return { status: 'error', error: 'No UUID provided' };
    }

    try {
      const response =
        await this.apiService.operations.image.getImageBinary(imageUuid);

      // Image not found on server
      if (response.status === 404) {
        return { status: 'not_found', error: 'Image not found on server' };
      }

      // Other HTTP errors
      if (!response.ok) {
        return {
          status: 'error',
          error: `Server error: ${response.status}`,
          httpStatus: response.status,
        };
      }

      const imageBlob = await response.blob();

      return {
        status: 'success',
        data: {
          uuid: imageUuid,
          blob: imageBlob,
          size: imageBlob.size,
          mimeType: imageBlob.type,
        },
      };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      // Network error or server unavailable
      return {
        status: 'error',
        error: errorMessage,
        networkError: true,
      };
    }
  }
}
