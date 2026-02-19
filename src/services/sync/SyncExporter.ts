/**
 * Service de synchronisation unifié
 * Responsabilité: Logique de synchronisation (counts, opérations) - conflits externalisés
 *
 * 🚀 Service PUR - Aucune dépendance directe sur DataService
 * Les repositories sont injectés depuis DataContext pour éviter les dépendances circulaires
 */
import { config, EndpointSyncable } from '@src/config/config';
import { Recipe } from '@src/models/entities/Recipe';
import { Entity, EntityApi, EntitySyncable } from '@src/types/entities';
import { RepositoriesMap, SyncRepository } from '@src/types/repositories';
import {
  SyncPushBulkResult,
  SyncPushResult,
  SyncResults,
} from '@src/types/sync';
import { ApiService } from '../api/ApiService';
import { ImageRepository } from '../data/repositories/ImageRepository';
import { DebugService } from '../DebugService';
import { SyncStore } from '../stores/SyncStore';
import { EventPayloads } from '../utils/EventBus';
import { getErrorMessage } from '../utils/GlobalUtils';
import { SyncAction, SyncService } from './SyncService';

export class SyncExporter {
  results: SyncResults;
  syncedEntities: Map<string, string>;
  endpoint: EndpointSyncable;
  entitiesToExport: EntitySyncable[];
  repositories: RepositoriesMap;
  syncStore: SyncStore;
  _emitSyncEvent: (
    action: SyncAction,
    data: EventPayloads[keyof EventPayloads],
  ) => void;
  apiService: ApiService;
  bulkSync: boolean;

  constructor(
    endpoint: EndpointSyncable,
    entitiesToExport: EntitySyncable[],
    syncService: SyncService,
    bulkSync = true,
  ) {
    this.results = { success: 0, failed: 0, errors: [] };
    this.syncedEntities = new Map();
    this.endpoint = endpoint;
    this.entitiesToExport = entitiesToExport;
    this.repositories = syncService.repositories;
    this.syncStore = syncService.syncStore;
    this._emitSyncEvent = syncService._emitSyncEvent.bind(syncService);
    this.apiService = syncService.apiService;
    this.bulkSync = bulkSync;
  }

  async export() {
    const entitiesToExport = this.entitiesToExport;

    if (entitiesToExport.length === 0) {
      this.syncStore.setEndpointExportResults(this.endpoint, this.results);
      return;
    }

    try {
      const exportResults = await this._exportEntities(
        this.endpoint,
        entitiesToExport,
      );

      // Post-export processing (images, sync dates)
      // This can modify exports counters (e.g., image upload failures)
      await this._afterExport(this.endpoint, entitiesToExport, exportResults);

      // Update SyncStore with export results
      this.syncStore.setEndpointExportResults(this.endpoint, this.results);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      // Critical error: API unavailable, network error, etc.
      console.error(
        `Critical error during export for ${this.endpoint}:`,
        error,
      );
      this.syncStore.setEndpointCriticalError(
        this.endpoint,
        `Export critical failure: ${errorMessage}`,
      );
      this.syncStore.setEndpointExportResults(this.endpoint, this.results);
      throw error;
    }
  }

  /**
   * Exports a list of entities to the API in batches
   * Handles batch failures by retrying individual entities
   * @private
   */
  async _exportEntities(
    endpoint: EndpointSyncable,
    entities: EntitySyncable[],
    batchSize = 20,
  ) {
    // Process entities in batches to avoid timeouts
    const exportResults = [];
    if (entities.length === 0) {
      return [];
    }
    for (let i = 0; i < entities.length; i += batchSize) {
      const batch = entities.slice(i, i + batchSize);
      const batchResults = await this._exportBatch(endpoint, batch);

      // Process batch results
      for (const result of batchResults) {
        if (result.success) {
          this.results.success++;
          this.syncedEntities.set(result.uuid, result.dateReceived || '');
        } else {
          this.results.failed++;
          this.results.errors.push(
            `Export failed for ${endpoint} ${result.uuid}: ${result.error}`,
          );
          this.syncedEntities.delete(result.uuid);
        }
      }
      exportResults.push(...batchResults);
    }
    return exportResults;
  }

  /**
   * Exports a single batch of entities
   * On batch failure, retries each entity individually
   * @private
   */
  async _exportBatch(
    endpoint: EndpointSyncable,
    entities: EntitySyncable[],
  ): Promise<SyncPushResult[]> {
    const repository = this.repositories.get(endpoint) as SyncRepository;

    // Prepare entities for API based on sync context
    let entitiesToApi: EntityApi[];

    if (this.bulkSync) {
      // Bulk sync: use toApi() directly
      // Dependencies are already synced in bulk before recipes
      entitiesToApi = entities.map((entity) => entity.toApi());
    } else {
      // Single entity sync: hydrate with complete data
      // Use hydrate to include dependent entities (ingredients, types)
      entitiesToApi = await Promise.all(
        entities.map(async (entity) => {
          // For recipes: hydrate with ingredients and types (with full entities)
          if (endpoint === 'recipes') {
            const hydratedEntity = await repository.get(
              entity.uuid,
              {
                complete: true,
                withRecipeIngredients: true,
                withRecipeTypes: true,
                hydrateDependencies: 'full',
              },
              false,
            );
            return hydratedEntity?.toApi() || entity.toApi();
          }
          // For other endpoints: just use toApi()
          return entity.toApi();
        }),
      );
    }

    try {
      const batchResults = (await this.apiService.operations.entity.push(
        endpoint,
        entitiesToApi,
      )) as SyncPushBulkResult;

      if (!batchResults) {
        throw new Error('No response from bulk export');
      }

      // Process batch results, retry failures individually if batch size > 1
      return this._processBatchResults(
        endpoint,
        entitiesToApi,
        batchResults.results || [],
      );
    } catch (error) {
      // Batch request failed completely, retry all entities individually
      return this._retryEntitiesIndividually(endpoint, entitiesToApi);
    }
  }

  /**
   * Processes batch results, retrying failed entities individually
   * @private
   */
  async _processBatchResults(
    endpoint: EndpointSyncable,
    entitiesToApi: EntityApi[],
    batchResults: SyncPushResult[],
  ): Promise<SyncPushResult[]> {
    const results = [];
    const isSingleEntity = batchResults.length === 1;

    for (const result of batchResults) {
      // Success: keep result as-is
      if (result.success) {
        results.push(result);
        continue;
      }

      // Failure in single-entity batch: don't retry
      if (isSingleEntity) {
        results.push({
          ...result,
          error: result.error || 'Unknown error',
        });
        continue;
      }

      // Failure in multi-entity batch: retry individually
      const entityToApi = entitiesToApi.find((e) => e.uuid === result.uuid);
      if (!entityToApi) {
        results.push({
          ...result,
          error: 'Entity data not found in batch',
        });
        continue;
      }

      const retryResult = await this._exportSingleEntity(endpoint, entityToApi);
      results.push(retryResult);
    }

    return results;
  }

  /**
   * Retries all entities individually after batch failure
   * @private
   */
  async _retryEntitiesIndividually(
    endpoint: EndpointSyncable,
    entitiesToApi: EntityApi[],
  ): Promise<SyncPushResult[]> {
    const results = [];

    for (const entityToApi of entitiesToApi) {
      const result = await this._exportSingleEntity(endpoint, entityToApi);
      results.push(result);
    }

    return results;
  }

  /**
   * Exports a single entity
   * @private
   */
  async _exportSingleEntity(
    endpoint: EndpointSyncable,
    entityToApi: EntityApi,
  ): Promise<SyncPushResult> {
    try {
      const result = (await this.apiService.operations.entity.push(
        endpoint,
        entityToApi,
      )) as SyncPushResult;

      return result && result.success
        ? result
        : {
            uuid: entityToApi.uuid,
            success: false,
            error: result?.error || 'Unknown error during single export',
            dateReceived: '',
          };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      return {
        uuid: entityToApi.uuid,
        success: false,
        error: errorMessage,
        dateReceived: '',
      };
    }
  }

  /**
   * Post-processing after entity export
   * Handles recipe images upload and synced date updates
   * @private
   */
  async _afterExport(
    endpoint: EndpointSyncable,
    originalEntities: Entity[],
    exportResults: SyncPushResult[],
  ) {
    const repository = this.repositories.get(endpoint) as SyncRepository;
    DebugService.log('sync', 'SyncExporter: post-export processing', endpoint);
    // Upload recipe images if endpoint is recipes
    if (endpoint === config.ENDPOINTS_CONSTANTS.RECIPES) {
      await this._uploadRecipesImages(
        originalEntities as Recipe[],
        exportResults,
      );
    }

    // Update sync dates for successfully exported entities
    await this._updateSyncDates(endpoint, repository);
  }

  /**
   * Uploads images for successfully exported recipes
   * @param {Array} originalEntities - Original recipe entities
   * @param {Array} exportResults - Export results array
   * @private
   */
  async _uploadRecipesImages(
    originalEntities: Recipe[],
    exportResults: SyncPushResult[],
  ) {
    const successfulExports = exportResults.filter(
      (res) => res.success && res.imageChanged,
    );

    for (const result of successfulExports) {
      const originalEntity = originalEntities.find(
        (e) => e.uuid === result.uuid,
      );

      // Skip if no image to upload
      if (!originalEntity?.imageUuid) {
        continue;
      }

      try {
        const imageRepository = this.repositories.get(
          config.ENDPOINTS_CONSTANTS.IMAGES,
        ) as ImageRepository;
        const image = await imageRepository.get(originalEntity.imageUuid);

        if (!image?.blob) {
          DebugService.log('sync', 'SyncExporter: no blob found for image', {
            imageUuid: originalEntity.imageUuid,
          });
          continue;
        }

        // Créer FormData avec le blob de l'image et son UUID
        const formData = new FormData();
        formData.append('file', image.blob);
        formData.append('uuid', image.uuid);

        const imageResult =
          await this.apiService.operations.recipe.uploadRecipeImage(
            originalEntity.uuid,
            formData,
          );
        DebugService.log('sync', 'SyncExporter: uploaded recipe image', {
          originalEntityUuid: originalEntity.uuid,
          imageResult,
        });

        if (!imageResult.success) {
          this.results.success--;
          this.syncedEntities.delete(result.uuid);
        }
      } catch (error) {
        this.results.success--;
        this.syncedEntities.delete(result.uuid);
      }
    }
  }

  /**
   * Updates sync dates for successfully exported entities
   * @private
   */
  async _updateSyncDates(
    endpoint: EndpointSyncable,
    repository: SyncRepository,
  ) {
    // From syncedEntities map this.syncedEntities
    if (this.syncedEntities.size === 0) return;
    for (const [uuid, dateReceived] of this.syncedEntities.entries()) {
      await repository.synced(uuid, dateReceived);
      DebugService.log(
        'sync',
        'SyncService: updated local entity after export',
        { endpoint, uuid },
      );
    }
  }
}
