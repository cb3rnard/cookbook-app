/**
 * Service de synchronisation unifié
 * Responsabilité: Logique de synchronisation (counts, opérations) - conflits externalisés
 * 
 * 🚀 Service PUR - Aucune dépendance directe sur DataService
 * Les repositories sont injectés depuis DataContext pour éviter les dépendances circulaires
 */
import { DebugService } from '../DebugService';
import { EventBus } from '../utils/EventBus';
import { delayExecution } from '../utils/GlobalUtils';
import { SyncApiOperations } from './SyncApiOperations';
import { SyncConflictsService } from './SyncConflictsService';
import { SyncStatusService } from './SyncStatusService';

export class SyncService {
    /**
     * @param {Object} repositories - Map des repositories injectés depuis DataService
     */
    constructor(repositories) {
        this.repositories = repositories;
        this.eventBus = EventBus.getInstance();
        this.statusService = new SyncStatusService();
        this._setupEntitySyncListener();
    }

    async initialize() {
        await this.statusService.initialize();
        return true;
    }

    getStatusService() {
        return this.statusService;
    }

    /**
     * Configure l'écoute des événements de sync d'entité
     * @private
     */
    _setupEntitySyncListener() {
        this.eventBus.on('entity:sync:request', async (data) => {
            const { endpoint, uuid, hydrate, callback } = data;
            DebugService.log(['SyncService: entity sync requested', { endpoint, uuid, hydrate }], 'sync');

            try {
                const syncedEntity = await this.syncEntity(endpoint, uuid, hydrate);
                callback(syncedEntity);
            } catch (error) {
                console.error('Entity sync failed:', error);
                callback(null);
            }
        });
    }

    /**
     * Émet un événement de synchronisation
     * @private
     */
    _emitSyncEvent(action, data) {
        this.eventBus.emit(`sync:${action}`, data);
    }

    // ==================== CONFLICT DETECTION & RESOLUTION ====================

    /**
     * Résout les conflits de version selon une stratégie
     * @param {Array} localEntities - Entités locales
     * @param {Array} remoteEntities - Entités distantes
     * @param {string} strategy - Stratégie de résolution
     * @returns {Object} Résolution des conflits
     */
    resolveVersionConflicts(localEntities, remoteEntities, strategy = 'LAST_WRITE_WINS') {
        return SyncConflictsService.resolveVersionConflicts(localEntities, remoteEntities, strategy);
    }

    /**
    /**
     * Résout les conflits de noms (méthode déléguée)
     */
    async resolveNameConflicts(entities, repository) {
        return SyncConflictsService.resolveNameConflicts(entities, repository);
    }

    // ==================== SYNC OPERATIONS ====================

    /**
     * Synchronisation complète bidirectionnelle
     * @param {number} delay - Délai entre opérations
     * @param {string} conflictStrategy - Stratégie de résolution des conflits
     * @param {boolean} incremental - Sync incrémentale ou complète
     * @returns {Promise<Object>} Résultats de la synchronisation
     */
    async sync(delay = 0, conflictStrategy = 'LAST_WRITE_WINS', incremental = false) {
        this.statusService.clearErrors();
        const results = {
            recipes: { imported: 0, exported: 0, failedImported: 0, failedExported: 0, conflicts: 0, errors: [] },
            ingredients: { imported: 0, exported: 0, failedImported: 0, failedExported: 0, conflicts: 0, errors: [] },
            types: { imported: 0, exported: 0, failedImported: 0, failedExported: 0, conflicts: 0, errors: [] },
            totalFailed: 0,
            totalImported: 0,
            totalErrors: 0,
            allFailed: false,
            success: false
        };

        try {
            this.statusService.startOperation(incremental ? 'incrementalSync' : 'fullSync');
            this.eventBus.emit('sync:started', { operation: incremental ? 'incrementalSync' : 'fullSync' });

            // Ordre optimisé : dépendances d'abord, puis recettes avec leurs dépendances complètes
            const endpoints = ['types', 'ingredients', 'recipes'];
            const totalSteps = endpoints.length;

            let currentStep = 0;

            for (const endpoint of endpoints) {
                console.log(`Syncing entity type: ${endpoint}`);
                this.statusService.updateProgress(currentStep, totalSteps, { entity: endpoint, step: 'Synchronisation' });

                const entityResults = await this._syncEntityType(
                    this.repositories.get(endpoint),
                    conflictStrategy,
                    delay,
                    incremental
                );
                results[endpoint] = entityResults;
                currentStep++;
            }

            results.totalImported = results.recipes.imported + results.ingredients.imported + results.types.imported;
            results.totalExported = results.recipes.exported + results.ingredients.exported + results.types.exported;
            results.totalErrors = results.recipes.errors.length + results.ingredients.errors.length + results.types.errors.length;
            results.totalSuccess = results.totalImported + results.totalExported;
            results.totalFailed = results.recipes.failedExported + results.ingredients.failedExported + results.types.failedExported;
            results.allFailed = results.totalFailed > 0 && results.totalSuccess === 0;

            results.success = true;

            this.statusService.finishOperation(true, results);
            this.eventBus.emit('sync:completed', results);
            this.eventBus.emit(incremental ? 'incrementalSync:completed' : 'fullSync:completed', results);
            // await this.getCountsAndDirty();
            return results;

        } catch (error) {
            console.error('Sync failed:', error);
            results.success = false;
            results.error = error.message;
            this.statusService.finishOperation(false, results);
            this.statusService.addError(error);

            this.eventBus.emit('sync:error', error);
            // await this.getCountsAndDirty();
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
    async syncEntity(endpoint, entityUuid, hydrate = { withAll: true, construct: true }, conflictStrategy = 'LAST_WRITE_WINS') {
        const results = { imported: 0, exported: 0, failedImported: 0, failedExported: 0, conflicts: 0, errors: [] };

        try {
            const repository = this.repositories.get(endpoint);
            if (!repository) {
                throw new Error(`Unknown endpoint: ${endpoint}`);
            }

            // Récupère l'entité locale
            const localEntity = await repository.get(entityUuid, hydrate, false);
            // Construit l'entité pour pouvoir utiliser toApi()
            const localConstructedEntity = (hydrate.construct && hydrate.withAll) ? localEntity : await repository.get(entityUuid, { withAll: true, construct: true }, false);

            // Récupère l'entité distante modifiée depuis la dernière sync locale
            const since = localEntity?.lastSyncDate || null;
            let remoteModifiedEntity = null;

            try {
                // Pour les recettes, utiliser l'endpoint avec dépendances
                if (endpoint === 'recipes') {
                    remoteModifiedEntity = await SyncApiOperations.getRecipeWithDependencies(entityUuid, since);
                } else {
                    remoteModifiedEntity = await SyncApiOperations.get(endpoint, entityUuid, since);
                }
            } catch (error) {
                DebugService.log(['SyncService._syncEntity: remote entity not found or not modified', { endpoint, entityUuid, error: error.message }], 'sync');
                remoteModifiedEntity = null;
            }

            // Si ni entité distante ni entité locale ou non modifiée
            if (!remoteModifiedEntity && (!localEntity || !localEntity.isDirty)) {
                DebugService.log(['SyncService._syncEntity: no changes detected, skipping sync', { endpoint, entityUuid }], 'sync');
                this.statusService.finishOperation(true);
                return localEntity;
            }

            this.statusService.startOperation('syncEntity');
            this.eventBus.emit('sync:started', { operation: `syncEntity_${endpoint}` });

            // Résolution de conflits
            const resolution = this.resolveVersionConflicts(
                localConstructedEntity?.isDirty ? [localConstructedEntity] : [],
                remoteModifiedEntity ? [remoteModifiedEntity] : [],
                conflictStrategy
            );

            const syncResults = await this._syncResolution(repository, resolution, 0);
            const syncedEntity = await repository.get(entityUuid, hydrate, false);

            this.statusService.finishOperation(true, syncResults);
            this.eventBus.emit('sync:completed', syncResults);

            return syncedEntity;
        } catch (error) {
            results.error = error.message;
            results.errors.push(error.message);
            this.statusService.addError(error);
            this.statusService.finishOperation(false, results);
            this.eventBus.emit('sync:error', error);
            throw error;
        }
    }




    // ==================== PRIVATE SYNC METHODS ====================

    /**
     * Synchronise un type d'entité spécifique
     * @private
     * @param {string} repository - Repository de l'entité
     * @param {number} conflictStrategy - Stratégie de résolution des conflits
     * @param {number} delay - Délai entre les opérations
     * @param {boolean} incremental - Indique si la sync est incrémentale
     * @returns {Promise<Object>} Résultats de la synchronisation
     */
    async _syncEntityType(repository, conflictStrategy = 0, delay, incremental = false) {
        const results = { imported: 0, exported: 0, failedImported: 0, failedExported: 0, conflicts: 0, errors: [] };
        const endpoint = repository.endpoint;

        try {
            const progress = this.statusService.getProgress();
            let localEntities, remoteEntities;
            if (incremental) {
                localEntities = await repository.getDirty({}, { withAll: true, construct: true });
                remoteEntities = await SyncApiOperations.getAllSince(endpoint);
            } else {
                localEntities = await repository.getAll({}, { withAll: true });
                remoteEntities = await SyncApiOperations.getAll(endpoint);
            }

            this.statusService.updateProgress(progress.current, progress.total, { entity: endpoint, step: 'Détection et résolution des conflits' });
            const resolution = this.resolveVersionConflicts(
                localEntities,
                remoteEntities,
                conflictStrategy
            );

            const results = await this._syncResolution(repository, resolution, delay);
            return results;
        } catch (error) {
            console.error(`Error syncing entity type ${endpoint}:`, error);
            results.errors.push(`Sync failed for ${endpoint}: ${error.message}`);
            this.statusService.addError(`Sync failed for ${endpoint}: ${error.message}`);
            return results;
        }
    }

    async _syncResolution(repository, resolution, delay) {
        const results = { imported: 0, exported: 0, failedImported: 0, failedExported: 0, conflicts: 0, errors: [] };
        const endpoint = repository.endpoint;

        // IMPORT DES ENTITÉS DISTANTES
        if (resolution.toLocal.length > 0) {
            let entitiesToImport = resolution.toLocal;
            if (['types', 'ingredients'].includes(endpoint)) {
                // Résolution des conflits de noms pour types et ingrédients
                entitiesToImport = await this.resolveNameConflicts(resolution.toLocal, repository);
            }
            await delayExecution(delay);

            const progress = this.statusService.getProgress();
            this.statusService.updateProgress(progress.current, progress.total, { endpoint: endpoint, step: 'Import' });
            for (const entityData of entitiesToImport) {
                // Traitement spécifique données associées aux recettes
                if (endpoint === 'recipes') {
                    try {
                        await this._saveRecipeRelations(entityData);
                    } catch (error) {
                        console.error(`Failed to sync dependencies for recipe ${entityData.uuid}:`, error);
                        results.errors.push(`Failed to sync dependencies for recipe ${entityData.uuid}: ${error.message}`);
                        results.failedImported++;
                        continue; // Skip cette recette si les dépendances échouent
                    }
                }

                try {
                    const savedEntity = await repository.save(entityData, false, true);
                    results.imported++;
                    this.eventBus.emit('sync:imported', { endpoint: endpoint, entity: savedEntity });
                } catch (error) {
                    console.error(`Error syncing entity type ${endpoint}:`, error);
                    results.errors.push(`Import failed for ${endpoint} ${entityData.uuid}: ${error.message}`);
                    results.failedImported++;
                }
            }
        }
        await delayExecution(delay);

        const progressExport = this.statusService.getProgress();
        this.statusService.updateProgress(progressExport.current, progressExport.total, { entity: endpoint, step: 'Export' });

        // EXPORT DES ENTITÉS LOCALES
        if (resolution.toRemote.length > 0) {
            try {
                const exportResults = await this._exportEntities(endpoint, resolution.toRemote);

                results.exported += exportResults.exported;
                results.failedExported += exportResults.failedExported;
                results.errors.push(...exportResults.errors);

                // Met à jour la date de sync à la date de réception du serveur pour les entités exportées
                for (const result of exportResults.entities || []) {
                    // Passer si l'export a échoué
                    if (!result.success) {
                        continue;
                    }

                    const dateReceived = result.dateReceived || null;

                    try {
                        await repository.synced(result.uuid, dateReceived);
                        this.eventBus.emit('sync:synced', { endpoint: endpoint, uuid });
                        DebugService.log(['SyncService: updated local entity after export', endpoint, uuid], 'sync');
                    } catch (error) {
                        console.error(`Error updating local entity after export ${endpoint} ${result.uuid}:`, error);
                        results.errors.push(`Export failed for ${result.uuid}: ${error.message}`);
                    }
                }
            } catch (error) {
                console.error('Error exporting entities:', error);
                results.errors.push(`Export failed for ${endpoint}: ${error.message}`);
            }
            const hasExportedOrImported = results.exported + results.imported > 0;
            if (hasExportedOrImported) {
                this.eventBus.emit('sync:updated', { endpoint: endpoint });
            }
            // results.errors.push(...exportResults.errors);
        }
        await delayExecution(delay);

        results.conflicts = resolution.conflicts.length;
        return results;
    }

    /**
     * Synchronise les dépendances d'une recette (version simplifiée avec endpoint /with_dependencies)
     * @private
     */
    async _saveRecipeRelations(recipeData) {
        try {
            const dependenciesToSave = [];

            // Extraire les ingrédients complets
            if (Array.isArray(recipeData.ingredients)) {
                for (const recipeIngredient of recipeData.ingredients) {
                    const ingredient = recipeIngredient.ingredient;
                    if (ingredient && ingredient.uuid) {
                        dependenciesToSave.push({ endpoint: 'ingredients', data: ingredient });
                    }
                }
            }

            // Extraire les types complets
            if (Array.isArray(recipeData.types)) {
                for (const recipeType of recipeData.types) {
                    const type = recipeType.type;
                    if (type && type.uuid) {
                        dependenciesToSave.push({ endpoint: 'types', data: type });
                    }
                }
            }

            // Sauvegarder toutes les dépendances
            for (const dep of dependenciesToSave) {
                try {
                    const repository = this.repositories.get(dep.endpoint);
                    await repository.save(dep.data, false, true);
                } catch (error) {
                    console.warn(`Failed to save ${dep.type} dependency:`, error);
                    throw error;
                }
            }

            // Gérer l'image de la recette
            if (recipeData.imageUuid) {
                recipeData.image = await this.getNewRemoteRecipeImage(recipeData.imageUuid);
            }
        } catch (error) {
            throw new Error(`Failed to sync dependencies for recipe ${recipeData.uuid}: ${error.message}`);
        }
    }

    /**
     * Télécharge l'image d'une recette si elle n'existe pas localement
     * @private 
     * @param {string} imageUuid - UUID de l'image
     * @returns {Promise<Object|null>} Données de l'image ou null si pas d'image
     */
    async getNewRemoteRecipeImage(imageUuid) {
        if (imageUuid == null) {
            return null;
        }
        const imageRepository = this.repositories.get('images');
        const existingImage = await imageRepository.get(imageUuid);
        if (existingImage) {
            return null;
        }
        try {
            const imageBlob = await SyncApiOperations.getImageBinary(imageUuid).then(r => r.blob());

            return {
                uuid: imageUuid,
                blob: imageBlob,
                size: imageBlob.size,
                mimeType: imageBlob.type,
            };
        } catch (error) {
            console.error(`Failed to download image ${recipeData.image.uuid}:`, error);
            return null;
            // throw new Error(`Failed to download image ${recipeData.image.uuid}: ${error.message}`);
        }
    }

    /**
     * Exporte une liste d'entités vers l'API
     * @private
     */
    async _exportEntities(endpoint, entities, batchSize = 20) {
        const results = { exported: 0, failedExported: 0, errors: [], entities: [] };

        // Découper en lots pour éviter les timeouts
        for (let i = 0; i < entities.length; i += batchSize) {
            const batch = entities.slice(i, i + batchSize);
            const entitiesToApi = batch.map(entity => {
                return entity.toApi();
            });

            let batchResults;

            try {
                batchResults = await SyncApiOperations.push(endpoint, entitiesToApi);

                if (!batchResults) {
                    throw new Error('No response from bulk export');
                }

            } catch (error) {
                batchResults = {
                    success: false,
                    error: error.message,
                    results: entitiesToApi.map(e => ({
                        uuid: e.uuid,
                        success: false,
                        error: error.message,
                        dateReceived: null
                    }))
                };

            }


            // Parcourt les résultats du batch
            for (const res of batchResults.results || []) {

                // Si succès, incrémente et ajoute aux résultats
                if (res.success) {
                    results.exported++;
                    results.entities.push(res);
                }

                // Si échec, tente une exportation individuelle, sauf si le batch ne contient qu'une entité
                else if (batchResults.results.length === 1) {
                    results.failedExported++;
                    results.errors.push(`Export failed for ${endpoint} ${res.uuid}: ${res.error || 'Unknown error'}`);
                    results.entities.push(res);
                } else {
                    const entityToApi = entitiesToApi.find(e => e.uuid === res.uuid);

                    if (entityToApi) {
                        try {
                            const singleResult = await SyncApiOperations.push(endpoint, entityToApi);

                            if (singleResult && singleResult.success) {
                                results.exported++;
                                results.entities.push(singleResult);
                            } else {
                                results.failedExported++;
                                results.entities.push(res);
                                const errorMsg = singleResult?.error || 'Unknown error during single export';
                            }
                        } catch (error) {
                            results.failedExported++;
                            results.errors.push(`Export failed for ${endpoint} ${res.uuid}: ${error.message}`);
                            const singleResult = { uuid: res.uuid, success: false, error: error.message };
                            results.entities.push(singleResult);
                        }
                    } else {
                        results.failedExported++;
                        results.errors.push(`Export failed for ${endpoint} ${res.uuid}: Entity data not found in batch`);
                        results.entities.push(res);
                    }
                }
            }
        }

        // Traite les images des recettes exportées
        if (endpoint === 'recipes') {
            for (const res of results.entities) {
                if (!res.success || !res.imageChanged) continue;

                try {
                    const originalEntity = entities.find(e => e.uuid === res.uuid);
                    if (!originalEntity.image) {
                        results.errors.push(`Image ${res.imageChanged} not found for recipe ${res.uuid}`);
                        continue;
                    }
                    const image = this.repositories.get('images').constructEntity(originalEntity.image);
                    const imageData = image?.toApi();
                    const imageResult = await SyncApiOperations.uploadRecipeImage(res.uuid, imageData);

                    if (!imageResult.success) {
                        results.failedExported++;
                        results.exported--;
                        results.errors.push(`Image export failed for ${image.uuid}: ${imageResult.error || 'Unknown error'}`);
                        res.success = false;
                        res.error = imageResult.error || 'Unknown error';
                    }
                } catch (error) {
                    results.errors.push(`Image export failed for ${res.uuid}: ${error.message}`);
                    results.failedExported++;
                    results.exported--;
                    res.success = false;
                    res.error = error.message;
                }
            }
        }

        return results;
    }
}