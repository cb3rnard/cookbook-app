/**
 * Service API unifié
 * Responsabilité: Toutes les opérations API (CRUD entités + counts + UUIDs)
 */
import { ApiService } from '../api/ApiService.js';
import { DebugService } from '../DebugService.js';
import { SettingsService } from '../SettingsService.js';

export class SyncApiOperations {
    /**
     * Types d'entités supportés
     */
    static get endpoints() {
        return ['ingredients', 'types', 'recipes'];
    }

    static get api() {
        return ApiService.getInstance();
    }

    // ==================== ERROR HANDLING ====================



    // ==================== CRUD OPERATIONS ====================

    /**
     * Récupère une recette avec ses dépendances (ingrédients + types complets)
     * @param {string} uuid - UUID de la recette
     * @param {string|null} since - Date ISO pour filtrer les dépendances modifiées depuis
     * @returns {Promise<Object|null>} Recette avec dépendances complètes ou null
     */
    static async getRecipeWithDependencies(uuid, since = null) {
        DebugService.debug(`getRecipeWithDependencies`);
        if (!uuid) {
            throw new Error('UUID is required to fetch a recipe with dependencies');
        }

        const endpoint = `/recipes/${uuid}/with_dependencies`;
        const params = new URLSearchParams();
        if (since) {
            since = new Date(since).toISOString();
            params.append('since', new Date(since).toISOString());
        }
        const queryString = params.toString();
        const url = `${endpoint}${queryString ? `?${queryString}` : ''}`;
        const context = `getRecipeWithDependencies ${uuid}`;

        const response = await this.api.fetchEndpointWithRetry(url, { method: 'GET' }, {}, context);
        const responseData = await response.json();
        return responseData || null;
    }

    /**
     * Récupère une entité par son UUID
     * @param {string} entityType - Type d'entité (recipes, ingredients, types)
     * @param {string} uuid - UUID de l'entité
     * @returns {Promise<Object|null>} Entité trouvée ou null
     */
    static async get(entityType, uuid, since = null) {
        if (!uuid) {
            throw new Error('UUID is required to fetch an entity');
        }
        const endpoint = `/${entityType}/${uuid}`;
        const params = new URLSearchParams();
        if (since) {
            since = new Date(since).toISOString();
            params.append('since', new Date(since).toISOString());
        }
        const queryString = params.toString();
        const url = `${endpoint}${queryString ? `?${queryString}` : ''}`;
        const context = `get ${entityType} ${uuid} ${since ? `since ${since}` : ''}`;

        const response = await this.api.fetchEndpointWithRetry(url, { method: 'GET' }, {}, context);
        const responseData = await response.json();
        return responseData || null;
    }

    /**
     * Récupère toutes les entités d'un type
     * @param {string} entityType - Type d'entité (recipes, ingredients, types)
     * @param {string|null} since - Date ISO pour filtrer les entités modifiées depuis
     * @returns {Promise<Array>} Liste des entités
     */
    static async getAll(entityType, since = null) {
        const endpoint = `/${entityType}`;
        const params = new URLSearchParams();
        if (since) {
            since = new Date(since).toISOString();
            params.append('since', new Date(since).toISOString());
        }
        const queryString = params.toString();
        const url = `${endpoint}${queryString ? `?${queryString}` : ''}`;
        const context = `getAll ${entityType}`;

        const response = await this.api.fetchEndpointWithRetry(url, { method: 'GET' }, {}, context);
        const responseData = await response.json();
        return responseData?.member || [];
    }

    /**
     * Récupère toutes les recettes reçues par le serveur depuis une date, ou depuis la dernière sync par défaut
     * @param {string|null} since - Date ISO pour filtrer les recettes modifiées depuis
     * @returns {Promise<Array>} Liste des recettes
     */
    static async getAllSince(entityType, since = null) {
        if (!since) {
            since = await SettingsService.getSetting('lastSyncDate');
        }
        return this.getAll(entityType, since);
    }

    /**
     * Récupère des entités spécifiques par UUIDs
     * @param {string} entityType - Type d'entité
     * @param {Array} uuids - Liste des UUIDs à récupérer
     * @returns {Promise<Array>} Entités trouvées
     */
    static async pull(entityType, uuids) {
        if (!uuids || uuids.length === 0) {
            return [];
        }

        const endpoint = `/${entityType}/pull`;
        const payload = { uuids };
        const context = `pull ${entityType}`;

        const response = await this.api.fetchEndpointWithRetry(endpoint, { method: 'POST', body: payload }, {}, context);
        const responseData = await response.json();
        return responseData || [];
    }

    static async upsert(entityType, entityData) {
        const endpoint = `/${entityType}/upsert`;
        const context = `upsert ${entityType}`;

        const response = await this.api.fetchEndpointWithRetry(
            endpoint,
            { method: 'POST', body: entityData },
            { retries: 2 }, // Moins de retries pour les écritures
            context
        );
        const responseData = await response.json();
        return responseData;
    }

    /**
     * Supprime une entité
     * @param {string} entityType - Type d'entité
     * @param {number} id - ID de l'entité
     * @returns {Promise<boolean>} Succès de la suppression
     */
    static async delete(entityType, uuid) {
        const endpoint = `/${entityType}/${uuid}`;
        const context = `delete ${entityType}`;

        const response = await this.api.fetchEndpointWithRetry(
            endpoint,
            { method: 'DELETE' },
            { retries: 2 }, // Moins de retries pour les suppressions
            context
        );
        return true;
    }

    /**
     * Crée plusieurs entités en une fois
     * @param {string} entityType - Type d'entité
     * @param {Array} entitiesData - Liste des entités à créer
     * @returns {Promise<Array>} Entités créées
     */
    static async push(entityType, entitiesData, options = {}) {
        if (!entitiesData || entitiesData.length === 0) {
            return [];
        }

        const endpoint = `/${entityType}/push`;
        const context = `Push ${entityType}`;

        const response = await this.api.fetchEndpointWithRetry(
            endpoint,
            { method: 'POST', body: entitiesData, ...options },
            { retries: 2 }, // Moins de retries pour les écritures batch
            context
        );
        const responseData = await response.json();
        return responseData || [];
    }

    /**
     * Upload d'une image (traitement spécialisé pour FormData)
     * @param {FormData} formData - Données de l'image avec le fichier
     * @returns {Promise<Object>} Résultat de l'upload
     */
    static async uploadRecipeImage(recipeUuid, imageData) {
        const endpoint = `/recipes/${recipeUuid}/image`;
        const context = 'uploadImage';

        const response = await this.api.fetchEndpointWithRetry(
            endpoint,
            { method: 'POST', body: imageData },
            { retries: 2, timeout: 60000 }, // Plus de timeout pour les uploads
            context
        );
        const responseData = await response.json();
        return responseData;
    }


    /**
     * Télécharge l'image d'une recette si nécessaire
     * @private
     */
    async importRecipeImage(recipeData) {
        if (recipeData.image?.uuid == null) {
            return null;
        }
        const existingImage = await this.repositories.images.get(recipeData.image.uuid);
        if (existingImage) {
            return existingImage;
        } else {
            try {
                const imageBlob = await SyncApiOperations.getImageBinary(recipeData.image.uuid).then(r => r.blob());

                return {
                    uuid: recipeData.image.uuid,
                    blob: imageBlob,
                    size: imageBlob.size,
                    mimeType: imageBlob.type,
                };
            } catch (error) {
                throw new Error(`Failed to download image ${recipeData.image.uuid}: ${error.message}`);
            }
        }
    }

    /**
     * Téléchargement d'une image de recette
    */
    static async getImageBinary(uuid) {
        const context = 'downloadImage';

        const response = await this.api.fetchEndpointWithRetry(
            `/images/${uuid}/binary`,
            { method: 'GET', headers: { Accept: 'application/octet-stream' } },
            {},
            context
        );
        return response;
    }

    // ==================== COUNTS & UUIDS ====================

    /**
     * Récupère les compteurs d'entités depuis l'API
     * @returns {Promise<Object>} compteurs par type d'entité
     */
    static async getRemoteCounts() {
        const context = 'getRemoteCounts';

        try {
            const response = await this.api.fetchEndpointWithRetry('/global/counts', { method: 'GET' }, {}, context);
            const responseData = await response.json();

            return {
                recipes: responseData?.recipes || 0,
                ingredients: responseData?.ingredients || 0,
                types: responseData?.types || 0
            };
        } catch (error) {
            console.error('Error fetching remote counts:', error);
            throw error;
        }
    }

    /**
     * Récupère les références distantes avec métadonnées (UUID + version + dateModified)
     * @returns {Promise<Object>} Références avec métadonnées par type d'entité
     */
    static async getNewRemoteRefs(lastSyncDate = null) {
        const params = new URLSearchParams();
        if (!lastSyncDate) {
            lastSyncDate = await SettingsService.getSetting('lastSyncDate');
        }
        if (lastSyncDate) {
            params.append('since', new Date(lastSyncDate).toISOString());
        }
        const queryString = params.toString();
        const endpoint = '/global/versions';
        const url = `${endpoint}${queryString ? `?${queryString}` : ''}`;
        const context = 'getNewRemoteRefs';

        try {
            const response = await this.api.fetchEndpointWithRetry(url, { method: 'GET' }, {}, context);
            const responseData = await response.json();

            return {
                recipes: responseData?.recipes || [],
                ingredients: responseData?.ingredients || [],
                types: responseData?.types || []
            };
        } catch (error) {
            console.error('Error fetching remote dirty refs:', error);
            throw error;
        }
    }
}