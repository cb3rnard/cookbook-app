import { SyncConflictsService } from "./SyncConflictsService";

export class SyncImporter {
  constructor(endpoint, entitiesToImport, syncService) {
    this.results = { success: 0, failed: 0, errors: [] };
    this.endpoint = endpoint;
    this.entitiesToImport = entitiesToImport;
    this.syncService = syncService;
    this.repositories = syncService.repositories;
    this.syncStore = syncService.syncStore;
    this._emitSyncEvent = syncService._emitSyncEvent.bind(syncService);
  }

  async import() {
    const repository = this.repositories.get(this.endpoint);
    const entitiesToImport = this.entitiesToImport;

    try {
      if (entitiesToImport.length > 0) {
        for (const entityData of entitiesToImport) {
          try {
            await this._beforeImport(repository, entityData);
            const dateReceived = entityData.dateReceived || null;

            const savedEntity = await repository.save(
              entityData,
              false,
              dateReceived,
              true,
            );
            this.results.success++;
            this._emitSyncEvent("imported", {
              endpoint: this.endpoint,
              entity: savedEntity,
            });
          } catch (error) {
            // Entity-level error: log and continue with next entity
            console.error(
              `Import failed for ${this.endpoint} ${entityData.uuid}:`,
              error,
            );
            this.results.errors.push(`${entityData.uuid}: ${error.message}`);
            this.results.failed++;
          }
        }
      }

      // Update SyncStore with import results
      this.syncStore.setEndpointImportResults(this.endpoint, this.results);
    } catch (error) {
      // Critical error: repository access failed, Dexie error, etc.
      console.error(
        `Critical error during import for ${this.endpoint}:`,
        error,
      );
      this.syncStore.setEndpointCriticalError(
        this.endpoint,
        `Import critical failure: ${error.message}`,
      );
      this.syncStore.setEndpointImportResults(this.endpoint, this.results);
      throw error;
    }
  }
  async _beforeImport(repository, entityData) {
    const endpoint = repository.endpoint;

    if (["ingredients", "types"].includes(endpoint)) {
      // Unique name import conflict resolution
      await SyncConflictsService.resolveNameImportConflict(
        endpoint,
        this.repositories.get("recipes"),
        entityData,
      );
    }

    // Imports related entities for recipes (ingredients, types, image)
    if (endpoint === "recipes") {
      await this._importMissingRecipeDependencies(entityData);
    }
  }

  /**
   * Imports related entities for a recipe (ingredients, types, image)
   * if they are missing locally
   * @private
   */
  async _importMissingRecipeDependencies(recipeData) {
    /**** Ingredients and type */
    if (
      Array.isArray(recipeData.ingredients) ||
      Array.isArray(recipeData.types)
    ) {
      const relations = {
        ingredients: {
          repository: this.repositories.get("ingredients"),
          entities: Array.isArray(recipeData.ingredients)
            ? recipeData.ingredients.map((i) => i.ingredient || null)
            : [],
        },
        types: {
          repository: this.repositories.get("types"),
          entities: Array.isArray(recipeData.types)
            ? recipeData.types.map((t) => t.type || null)
            : [],
        },
      };

      // Identify missing related entities in recipe relations
      for (const [endpoint, relation] of Object.entries(relations)) {
        // Avoid duplicates
        const relationDependencies = new Map();
        const localEntities = new Map();
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
          relation.repository,
          Array.from(relationDependencies.values()),
          Array.from(localEntities.values()),
        );

        if (toLocal.length > 0) {
          const dependencyImporter = new SyncImporter(
            endpoint,
            toLocal,
            this.syncService,
          );
          const results = await dependencyImporter.import();
          if (results.failed > 0) {
            throw new Error(
              `Failed to import some ${endpoint} dependencies for recipe ${recipeData.uuid}`,
            );
          }
        }
      }
    }
  }
}
