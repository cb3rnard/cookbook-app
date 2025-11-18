import { database } from '../StorageService.js';
import { SyncApiOperations } from '../sync/SyncApiOperations.js';
import { SyncService } from '../sync/SyncService.js';
import { EventBus } from '../utils/EventBus.js';
import { ImageRepository } from './repositories/ImageRepository.js';
import { IngredientRepository } from './repositories/IngredientRepository.js';
import { NoteRepository } from './repositories/NoteRepository.js';
import { RecipeRepository } from './repositories/RecipeRepository.js';
import { TypeRepository } from './repositories/TypeRepository.js';

/**
 * Service central pour l'accès aux données
 */
export class DataService {
    static instance = null;

    constructor(connectionStatus = null) {
        if (DataService.instance) {
            // Si déjà initialisé, mettre à jour le statut de connexion
            if (connectionStatus) {
                DataService.instance.setConnectionStatus(connectionStatus);
            }
            return DataService.instance;
        }
        DataService.instance = this;

        this.repositories = new Map();
        this.eventBus = EventBus.getInstance();
        this.connectionStatus = connectionStatus;
        this.counts = {
            local: null,
            remote: null
        }
        this._setupRepositories();

        // 🚀 Créer SyncService avec les repositories configurés
        this.syncService = new SyncService(this.repositories);
        this._isInitialized = false;
    }

    /**
     * Met à jour le statut de connexion
     */
    setConnectionStatus(connectionStatus) {
        this.connectionStatus = connectionStatus;
        // Mettre à jour toutes les strategies d'entités
        this.repositories.forEach(repository => {
            repository.connectionStatus = connectionStatus;
        });
    }

    static getInstance(connectionStatus = null) {
        if (!DataService.instance) {
            DataService.instance = new DataService(connectionStatus);
        }
        return DataService.instance;
    }

    /**
     * Configuration des repositories pour chaque type d'entité
     */
    _setupRepositories() {
        const repositoryClasses = [RecipeRepository, IngredientRepository, TypeRepository, ImageRepository, NoteRepository];

        const repositoryInstances = repositoryClasses.map(RepositoryClass => new RepositoryClass(database, this.eventBus, this.connectionStatus));

        // Create set from endpoints and Repository instances
        const repositoryRegistry = new Map();
        repositoryInstances.forEach(repo => {
            repositoryRegistry.set(repo.endpoint, repo);
        });
        this.repositories = repositoryRegistry;

        repositoryInstances.forEach(repo => {
            repo.setRepositoriesRegistry(repositoryRegistry);
        });
    }

    // ACCES REPOSITORIES
    get recipes() {
        return this.repositories.get('recipes');
    }

    get ingredients() {
        return this.repositories.get('ingredients');
    }

    get types() {
        return this.repositories.get('types');
    }

    get images() {
        return this.repositories.get('images');
    }

    get notes() {
        return this.repositories.get('notes');
    }

    // Méthode générique (backward compatibility)
    getRepository(endpoint) {
        return this.repositories.get(endpoint);
    }

    /**
     * Récupère le service de synchronisation
     * @returns {SyncService}
     */
    getSyncService() {
        return this.syncService;
    }

    /**
     * Initialise les services de manière asynchrone
     * ⚠️ IMPORTANT: À appeler une seule fois au démarrage de l'app
     * @returns {Promise<DataService>} Cette instance pour chaînage
     */
    async initialize() {
        if (this._isInitialized) {
            console.warn('DataService already initialized');
            return this;
        }

        try {
            // Initialiser SyncService (qui initialise SyncStatusService)
            if (this.syncService) {
                await this.syncService.initialize();
            }

            this._isInitialized = true;
            return this;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Vérifie si les services sont initialisés
     * @returns {boolean}
     */
    get isInitialized() {
        return this._isInitialized;
    }

    async getLocalCounts() {
        const counts = {};
        try {
            counts.all = {
                recipes: await this.recipes.count(),
                ingredients: await this.ingredients.count(),
                types: await this.types.count()
            }

            // Récupérer les UUIDs dirty pour compatibilité
            counts.dirtyUuids = {
                recipes: await this.recipes.getDirtyUuids(),
                ingredients: await this.ingredients.getDirtyUuids(),
                types: await this.types.getDirtyUuids()
            };
            counts.dirty = {
                recipes: counts.dirtyUuids.recipes.length,
                ingredients: counts.dirtyUuids.ingredients.length,
                types: counts.dirtyUuids.types.length
            };

            counts.hasChanges = counts.dirty.recipes > 0 || counts.dirty.ingredients > 0 || counts.dirty.types > 0;
            return counts;
        } catch (error) {
            console.error('Failed to get local counts:', error);
            return {
                error: {
                    title: 'Données indisponibles',
                    message: 'Impossible de récupérer les données locales.'
                }
            };
        }
    }

    async getRemoteCounts() {
        try {
            if (this.connectionStatus?.online !== true) {
                throw new Error('Offline', { offline: true });
            }
            if (this.connectionStatus?.available !== true) {
                throw new Error('API Unavailable', { apiUnavailable: true });
            }
            const counts = {};
            counts.all = await SyncApiOperations.getRemoteCounts();
            

            counts.dirtyUuids = await this.getRemoteDirtyUuids();
            counts.dirty = {
                recipes: counts.dirtyUuids.recipes.length,
                ingredients: counts.dirtyUuids.ingredients.length,
                types: counts.dirtyUuids.types.length
            };

            counts.hasChanges = counts.dirty.recipes > 0 || counts.dirty.ingredients > 0 || counts.dirty.types > 0;

            return {
                ...counts,
                available: true
            };
        } catch (error) {
            console.error('Failed to get remote counts:', error);
            return {
                available: false,
                error: {
                    title: error.offline ? 'Hors ligne' : error.apiUnavailable ? 'Serveur indisponible' : 'Erreur serveur',
                    message: 'Impossible de récupérer les données distantes.'
                }
            }
        }
    }

    /**
     * 
     * Récupère les UUIDs et dates de réception côté API des entités réceptionnées par le serveur lors de la dernière synchronisation complète, et exclue les entités déjà synchronisées
     * @returns {Promise<Object>} UUIDs réellement dirty par type d'entité
     */
    async getRemoteDirtyUuids() {
        try {
            const newRemoteRefs = await SyncApiOperations.getNewRemoteRefs();
            const actualDirty = { recipes: [], ingredients: [], types: [] };

            for (const [endpoint, remoteRefs] of Object.entries(newRemoteRefs)) {
                const repository = this.repositories.get(endpoint);
                if (!repository) {
                    console.warn(`Repository not found for ${endpoint}`);
                    actualDirty[endpoint] = remoteUuids;
                    continue;
                }
                // Récupérer les UUIDs distants
                const remoteUuids = remoteRefs.map(ref => ref.uuid || ref).filter(Boolean);

                // Récupérer les entités locales correspondantes en batch
                const localEntities = await repository.getByUuids(remoteUuids);
                const localEntitiesMap = new Map(localEntities.map(entity => [entity.uuid, entity]));

                // Comparer la date de synchronisation de l'entité locale et la dernière date de réception distante
                for (const remoteRef of remoteRefs) {
                    const uuid = remoteRef.uuid || remoteRef;
                    const localEntity = localEntitiesMap.get(uuid);

                    // Si pas d'entité locale, c'est dirty (à importer)
                    if (!localEntity) {
                        actualDirty[endpoint].push(uuid);
                        continue;
                    }

                    const lastSyncDate = new Date(localEntity.lastSyncDate || 0);
                    const remoteReceivedDate = new Date(remoteRef.dateReceived || 0);

                    if (remoteReceivedDate > lastSyncDate) {
                        actualDirty[endpoint].push(uuid);
                    }
                }
            }
            return actualDirty;
        } catch (error) {
            throw error;
        }
    }
}