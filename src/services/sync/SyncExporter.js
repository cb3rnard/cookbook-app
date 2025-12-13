/**
 * Service de synchronisation unifié
 * Responsabilité: Logique de synchronisation (counts, opérations) - conflits externalisés
 *
 * 🚀 Service PUR - Aucune dépendance directe sur DataService
 * Les repositories sont injectés depuis DataContext pour éviter les dépendances circulaires
 */
import { DebugService } from "../DebugService";

export class SyncExporter {
  constructor(endpoint, entitiesToExport, syncService) {
    this.results = { success: 0, failed: 0, errors: [] };
    this.syncedEntities = new Map();
    this.endpoint = endpoint;
    this.entitiesToExport = entitiesToExport;
    this.repositories = syncService.repositories;
    this.syncStore = syncService.syncStore;
    this._emitSyncEvent = syncService._emitSyncEvent.bind(syncService);
    this.apiService = syncService.apiService;
  }

  async export() {
    const repository = this.repositories.get(this.endpoint);
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
      // Critical error: API unavailable, network error, etc.
      console.error(
        `Critical error during export for ${this.endpoint}:`,
        error,
      );
      this.syncStore.setEndpointCriticalError(
        this.endpoint,
        `Export critical failure: ${error.message}`,
      );
      this.syncStore.setEndpointExportResults(this.endpoint, this.results);
      throw error;
    }
  } /**
   * Exports a list of entities to the API in batches
   * Handles batch failures by retrying individual entities
   * @private
   * @param {string} endpoint - Entity endpoint (recipes, ingredients, types)
   * @param {Array} entities - Entities to export
   * @param {number} batchSize - Number of entities per batch
   * @returns {Promise<Object>} Export results
   */
  async _exportEntities(endpoint, entities, batchSize = 20) {
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
          this.syncedEntities.set(result.uuid, result.dateReceived || null);
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
  async _exportBatch(endpoint, entities) {
    const entitiesToApi = entities.map((entity) => entity.toApi());

    try {
      const batchResults = await this.apiService.operations.entity.push(
        endpoint,
        entitiesToApi,
      );

      if (!batchResults) {
        throw new Error("No response from bulk export");
      }

      // Process batch results, retry failures individually if batch size > 1
      return await this._processBatchResults(
        endpoint,
        entitiesToApi,
        batchResults.results || [],
      );
    } catch (error) {
      // Batch request failed completely, retry all entities individually
      return await this._retryEntitiesIndividually(
        endpoint,
        entitiesToApi,
        error.message,
      );
    }
  }

  /**
   * Processes batch results, retrying failed entities individually
   * @private
   */
  async _processBatchResults(endpoint, entitiesToApi, batchResults) {
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
          error: result.error || "Unknown error",
        });
        continue;
      }

      // Failure in multi-entity batch: retry individually
      const entityToApi = entitiesToApi.find((e) => e.uuid === result.uuid);
      if (!entityToApi) {
        results.push({
          ...result,
          error: "Entity data not found in batch",
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
  async _retryEntitiesIndividually(endpoint, entitiesToApi, batchError) {
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
  async _exportSingleEntity(endpoint, entityToApi) {
    try {
      const result = await this.apiService.operations.entity.push(
        endpoint,
        entityToApi,
      );

      return result && result.success
        ? result
        : {
            uuid: entityToApi.uuid,
            success: false,
            error: result?.error || "Unknown error during single export",
            dateReceived: null,
          };
    } catch (error) {
      return {
        uuid: entityToApi.uuid,
        success: false,
        error: error.message,
        dateReceived: null,
      };
    }
  }

  /**
   * Post-processing after entity export
   * Handles recipe images upload and synced date updates
   * @private
   * @param {string} endpoint - Entity endpoint
   * @param {Array} originalEntities - Original entities that were exported
   * @param {Array} exportResults - Export results array
   * @returns {Promise<void>}
   */
  async _afterExport(endpoint, originalEntities, exportResults) {
    const repository = this.repositories.get(endpoint);
    DebugService.log(
      ["SyncExporter: post-export processing", endpoint],
      "sync",
    );
    // Upload recipe images if endpoint is recipes
    if (endpoint === "recipes") {
      await this._uploadRecipesImages(originalEntities, exportResults);
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
  async _uploadRecipesImages(originalEntities, exportResults) {
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
        const image = await this.repositories
          .get("images")
          .get(originalEntity.imageUuid, { construct: true });
        const imageData = image?.toApi();
        const imageResult =
          await this.apiService.operations.recipe.uploadRecipeImage(
            originalEntity.uuid,
            imageData,
          );
        DebugService.log(
          [
            "SyncExporter: uploaded recipe image",
            originalEntity.uuid,
            imageResult,
          ],
          "sync",
        );

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
  async _updateSyncDates(endpoint, repository) {
    // From syncedEntities map this.syncedEntities
    if (this.syncedEntities.size === 0) return;
    for (const [uuid, dateReceived] of this.syncedEntities.entries()) {
      console.log(`SyncExporter: updating sync date for ${endpoint} ${uuid}`);
      await repository.synced(uuid, dateReceived);
      this._emitSyncEvent("synced", { endpoint, uuid });
      DebugService.log(
        ["SyncService: updated local entity after export", endpoint, uuid],
        "sync",
      );
    }
  }
}
