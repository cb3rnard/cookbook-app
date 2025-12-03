import { ApiOperations } from "./ApiOperations.js";

export class EntityApiOperations extends ApiOperations {
  constructor(apiService) {
    super(apiService);
    this.sessionStore = this.apiService.sessionStore;
  }

  /**
   * Récupère une entité par son UUID
   * @param {string} entityType - Type d'entité (recipes, ingredients, types)
   * @param {string} uuid - UUID de l'entité
   * @returns {Promise<Object|null>} Entité trouvée ou null
   */
  async get(entityType, uuid, since = null) {
    if (!uuid) {
      throw new Error("UUID is required to fetch an entity");
    }
    const endpoint = `/${entityType}/${uuid}`;
    const params = new URLSearchParams();
    if (since) {
      since = new Date(since).toISOString();
      params.append("since", new Date(since).toISOString());
    }
    const queryString = params.toString();
    const url = `${endpoint}${queryString ? `?${queryString}` : ""}`;
    const context = `get ${entityType} ${uuid} ${since ? `since ${since}` : ""}`;

    const response = await this.fetchEndpointWithRetry(
      url,
      { method: "GET" },
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
  async getAll(entityType, since = null) {
    const endpoint = `/${entityType}`;
    const params = new URLSearchParams();
    if (since) {
      since = new Date(since).toISOString();
      params.append("since", new Date(since).toISOString());
    }
    const queryString = params.toString();
    const url = `${endpoint}${queryString ? `?${queryString}` : ""}`;
    const context = `getAll ${entityType}`;

    const response = await this.fetchEndpointWithRetry(
      url,
      { method: "GET" },
      {},
      context,
    );
    const responseData = await response.json();
    return responseData?.member || [];
  }

  /**
   * Récupère toutes les recettes reçues par le serveur depuis une date, ou depuis la dernière sync par défaut
   * @param {string|null} since - Date ISO pour filtrer les recettes modifiées depuis
   * @returns {Promise<Array>} Liste des recettes
   */
  async getAllSince(entityType, since = null) {
    if (!since) {
      since = this.sessionStore.state.lastSyncDate;
    }
    return this.getAll(entityType, since);
  }

  /**
   * Récupère des entités spécifiques par UUIDs
   * @param {string} entityType - Type d'entité
   * @param {Array} uuids - Liste des UUIDs à récupérer
   * @returns {Promise<Array>} Entités trouvées
   */
  async pull(entityType, uuids) {
    if (!uuids || uuids.length === 0) {
      return [];
    }

    const endpoint = `/${entityType}/pull`;
    const payload = { uuids };
    const context = `pull ${entityType}`;

    const response = await this.fetchEndpointWithRetry(
      endpoint,
      { method: "POST", body: payload },
      {},
      context,
    );
    const responseData = await response.json();
    return responseData || [];
  }

  async upsert(entityType, entityData) {
    const endpoint = `/${entityType}/upsert`;
    const context = `upsert ${entityType}`;

    const response = await this.fetchEndpointWithRetry(
      endpoint,
      { method: "POST", body: entityData },
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
  async delete(entityType, uuid) {
    const endpoint = `/${entityType}/${uuid}`;
    const context = `delete ${entityType}`;

    const response = await this.fetchEndpointWithRetry(
      endpoint,
      { method: "DELETE" },
      { retries: 2 }, // Moins de retries pour les suppressions
      context,
    );
    return response;
  }

  /**
   * Crée plusieurs entités en une fois
   * @param {string} entityType - Type d'entité
   * @param {Array} entitiesData - Liste des entités à créer
   * @returns {Promise<Array>} Entités créées
   */
  async push(entityType, entitiesData, options = {}) {
    if (!entitiesData || entitiesData.length === 0) {
      return [];
    }

    const endpoint = `/${entityType}/push`;
    const context = `Push ${entityType}`;

    const response = await this.fetchEndpointWithRetry(
      endpoint,
      { method: "POST", body: entitiesData, ...options },
      { retries: 2 }, // Moins de retries pour les écritures batch
      context,
    );
    const responseData = await response.json();
    return responseData || [];
  }
}
