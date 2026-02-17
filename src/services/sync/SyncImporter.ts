import { config, EndpointSyncable } from '@src/config/config';
import {
  EntitySyncable,
  RecipeMainDependenciesEndpoint,
} from '@src/types/entities';
import {
  SyncRepositoriesMap,
  SyncRepository,
  UniqueNameRepository,
} from '@src/types/repositories';
import {
  EntitySyncableDataFromApi,
  RecipeFromApi,
  SyncResults,
} from '@src/types/sync';
import { RecipeRepository } from '../data/repositories/RecipeRepository';
import { SyncStore } from '../stores/SyncStore';
import { EventPayloads } from '../utils/EventBus';
import { getErrorMessage } from '../utils/GlobalUtils';
import { SyncConflictsService } from './SyncConflictsService';
import { SyncAction, SyncService } from './SyncService';

export class SyncImporter {
  endpoint: EndpointSyncable;
  entitiesToImport: EntitySyncableDataFromApi[];
  syncService: SyncService;
  repositories: SyncRepositoriesMap;
  syncStore: SyncStore;
  results: SyncResults;
  _emitSyncEvent: (
    action: SyncAction,
    data: EventPayloads[keyof EventPayloads],
  ) => void;

  constructor(
    endpoint: EndpointSyncable,
    entitiesToImport: EntitySyncableDataFromApi[],
    syncService: SyncService,
  ) {
    this.results = { success: 0, failed: 0, errors: [] };
    this.endpoint = endpoint;
    this.entitiesToImport = entitiesToImport;
    this.syncService = syncService;
    this.repositories = syncService.repositories;
    this.syncStore = syncService.syncStore;
    this._emitSyncEvent = syncService._emitSyncEvent.bind(syncService);
  }

  async import(): Promise<void> {
    const repository = this.repositories.get(this.endpoint) as SyncRepository;
    const entitiesToImport = this.entitiesToImport;

    try {
      if (entitiesToImport.length > 0) {
        for (const entityData of entitiesToImport) {
          try {
            await this._beforeImport(repository, entityData);

            const dateReceived = entityData.dateReceived;
            const entity = repository.constructEntity(entityData, false);

            await repository.save(
              entity as any,
              false,
              dateReceived,
              true,
              false,
            );
            this.results.success++;
            this._emitSyncEvent('imported', {
              endpoint: this.endpoint,
              entity: entity,
            });
          } catch (error) {
            // Entity-level error: log and continue with next entity
            const errorMessage = getErrorMessage(error);

            console.error(
              `Import failed for ${this.endpoint} ${entityData.uuid}:`,
              error,
            );
            this.results.errors.push(`${entityData.uuid}: ${errorMessage}`);
            this.results.failed++;
          }
        }
      }

      // Update SyncStore with import results
      this.syncStore.setEndpointImportResults(this.endpoint, this.results);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      // Critical error: repository access failed, Dexie error, etc.
      console.error(
        `Critical error during import for ${this.endpoint}:`,
        error,
      );
      this.syncStore.setEndpointCriticalError(
        this.endpoint,
        `Import critical failure: ${errorMessage}`,
      );
      this.syncStore.setEndpointImportResults(this.endpoint, this.results);
      throw error;
    }
  }
  async _beforeImport(
    repository: SyncRepository,
    entityData: EntitySyncableDataFromApi,
  ) {
    const endpoint = repository.endpoint;

    // Unique name import conflict resolution
    if (config.ENDPOINTS_UNIQUE_NAMES.find((e) => e === endpoint)) {
      const recipesRepository = this.repositories.get(
        config.ENDPOINTS_CONSTANTS.RECIPES,
      ) as RecipeRepository;
      await SyncConflictsService.resolveNameImportConflict(
        repository as UniqueNameRepository,
        recipesRepository,
        entityData,
      );
    }

    // Imports related entities for recipes (ingredients, types, image)
    if (endpoint === config.ENDPOINTS_CONSTANTS.RECIPES) {
      await this._importMissingRecipeDependencies(entityData as RecipeFromApi);
    }
  }

  /**
   * Imports related entities for a recipe (ingredients, types, image)
   * if they are missing locally
   * @private
   */
  async _importMissingRecipeDependencies(recipeData: RecipeFromApi) {
    /**** Ingredients and type */
    const dependencyEndpoints = config.RECIPES_MAIN_DEPENDENCIES;
    const relations: Record<
      RecipeMainDependenciesEndpoint,
      { repository: SyncRepository; entities: EntitySyncableDataFromApi[] }
    > = dependencyEndpoints.reduce((acc: any, endpoint) => {
      acc[endpoint] = {
        repository: this.repositories.get(endpoint)!,
        entities: Array.isArray(recipeData[endpoint])
          ? recipeData[endpoint].map(
              (rel: any) => rel[endpoint.slice(0, -1)] || null,
            )
          : [],
      };
      return acc;
    }, {});

    // Identify missing related entities in recipe relations
    for (const [endpoint, relation] of Object.entries(relations) as [
      RecipeMainDependenciesEndpoint,
      { repository: SyncRepository; entities: EntitySyncableDataFromApi[] },
    ][]) {
      // Avoid duplicates
      const relationDependencies = new Map<string, EntitySyncableDataFromApi>();
      const localEntities = new Map<string, EntitySyncable>();
      for (const dependency of relation.entities) {
        // If full object is provided
        if (dependency && dependency.uuid) {
          if (!relationDependencies.has(dependency.uuid)) {
            relationDependencies.set(dependency.uuid, dependency);
            const localEntity = await relation.repository.get(
              dependency.uuid,
              {},
              false,
            );
            if (localEntity && localEntity.isDirty) {
              localEntities.set(dependency.uuid, localEntity);
            }
          }
        }
      }

      const { toLocal } = await SyncConflictsService.detectConflicts(
        relation.repository.endpoint,
        Array.from(localEntities.values()),
        Array.from(relationDependencies.values()),
      );

      if (toLocal.length > 0) {
        const dependencyImporter = new SyncImporter(
          endpoint,
          toLocal,
          this.syncService,
        );
        await dependencyImporter.import();
        const results = dependencyImporter.results;
        if (results.failed > 0) {
          throw new Error(
            `Failed to import some ${endpoint} dependencies for recipe ${recipeData.uuid}`,
          );
        }
      }
    }
  }
}
