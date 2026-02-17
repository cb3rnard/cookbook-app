import { Endpoint } from '@src/config/config.js';
import { SessionStore } from '@src/services/stores/SessionStore.js';
import { EntityApi } from '@src/types/entities.js';
import {
  EntitySyncableDataFromApi,
  SyncPushBulkResult,
  SyncPushResult,
} from '@src/types/sync.ts';
import { ApiService } from '../ApiService.js';
import { ApiOperations } from './ApiOperations.js';

export class EntityApiOperations extends ApiOperations {
  sessionStore: SessionStore;

  constructor(apiService: ApiService) {
    super(apiService);
    this.sessionStore = this.apiService.sessionStore;
  }

  /**
   * Récupère une entité par son UUID
   * @param {string} endpoint - Type d'entité (recipes, ingredients, types)
   * @param {string} uuid - UUID de l'entité
   * @returns {Promise<Object|null>} Entité trouvée ou null
   */
  async get(
    endpoint: Endpoint,
    uuid: string,
    since = '',
  ): Promise<EntitySyncableDataFromApi | null> {
    if (!uuid) {
      throw new Error('UUID is required to fetch an entity');
    }
    const urlEndpoint = `/${endpoint}/${uuid}`;
    const params = new URLSearchParams();
    if (since) {
      since = new Date(since).toISOString();
      params.append('since', new Date(since).toISOString());
    }
    const queryString = params.toString();
    const url = `${urlEndpoint}${queryString ? `?${queryString}` : ''}`;
    const context = `get ${endpoint} ${uuid} ${since ? `since ${since}` : ''}`;

    const response = await this.fetchApiUrlWithRetry(
      url,
      { method: 'GET' },
      {},
      context,
    );
    const responseData = await response.json();
    return responseData || null;
  }

  /**
   * Récupère toutes les entités d'un type
   * @param {string} entityType - Type d'entité (recipes, ingredients, types)
   * @param {string|null} since - Date ISO pour filtrer les entités modifiées depuis
   * @returns {Promise<Array>} Liste des entités
   */
  async getAll(endpoint: Endpoint, since = '') {
    const urlEndpoint = `/${endpoint}`;
    const params = new URLSearchParams();
    if (since) {
      since = new Date(since).toISOString();
      params.append('since', new Date(since).toISOString());
    }
    const queryString = params.toString();
    const url = `${urlEndpoint}${queryString ? `?${queryString}` : ''}`;
    const context = `getAll ${endpoint}`;

    const response = await this.fetchApiUrlWithRetry(
      url,
      { method: 'GET' },
      {},
      context,
    );
    const responseData = await response.json();
    return responseData?.member || [];
  }

  /**
   * Récupère toutes les recettes reçues par le serveur depuis une date, ou depuis la dernière sync par défaut
   * @param {Endpoint} since - Date ISO pour filtrer les recettes modifiées depuis
   * @returns {Promise<Array>} Liste des recettes
   */
  async getAllSince(endpoint: Endpoint, since = '') {
    if (!since) {
      since = this.sessionStore.state.lastSyncDate;
    }
    return this.getAll(endpoint, since);
  }

  /**
   * Récupère des entités spécifiques par UUIDs
   * @param {Endpoint} endpoint - Type d'entité
   * @param {Array} uuids - Liste des UUIDs à récupérer
   * @returns {Promise<Array>} Entités trouvées
   */
  async pull(endpoint: Endpoint, uuids: string[]) {
    if (!uuids || uuids.length === 0) {
      return [];
    }

    const endpointUrl = `/${endpoint}/pull`;
    const payload = { uuids };
    const context = `pull ${endpoint}`;

    const response = await this.fetchApiUrlWithRetry(
      endpointUrl,
      { method: 'POST', body: payload },
      {},
      context,
    );
    const responseData = await response.json();
    return responseData || [];
  }

  async upsert(endpoint: Endpoint, entityData: EntityApi) {
    const endpointUrl = `/${endpoint}/upsert`;
    const context = `upsert ${endpoint}`;

    const response = await this.fetchApiUrlWithRetry(
      endpointUrl,
      { method: 'POST', body: entityData },
      { retries: 2 }, // Moins de retries pour les écritures
      context,
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
  async delete(endpoint: Endpoint, uuid: string) {
    const endpointUrl = `/${endpoint}/${uuid}`;
    const context = `delete ${endpoint}`;

    const response = await this.fetchApiUrlWithRetry(
      endpointUrl,
      { method: 'DELETE' },
      { retries: 2 }, // Moins de retries pour les suppressions
      context,
    );
    return response;
  }

  /**
   * Creates one or more entities in bulk
   */
  async push(
    endpoint: Endpoint,
    entitiesData: EntityApi | EntityApi[],
    options = {},
  ): Promise<SyncPushResult | SyncPushBulkResult> {
    const endpointUrl = `/${endpoint}/push`;
    const context = `Push ${endpoint}`;

    const response = await this.fetchApiUrlWithRetry(
      endpointUrl,
      { method: 'POST', body: entitiesData, ...options },
      { retries: 2 }, // Moins de retries pour les écritures batch
      context,
    );
    const responseData = await response.json();
    return responseData || [];
  }
}
