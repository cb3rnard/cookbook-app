import { SessionStore } from '@src/services/stores/SessionStore.js';
import { RecipeSchema } from '@src/services/UrlImporter.js';
import { remoteDirtyEntityVersions } from '@src/types/api.js';
import { EndpointCounts } from '@src/types/data.ts';
import { ApiService } from '../ApiService.js';
import { ApiOperations } from './ApiOperations.js';

export class GlobalApiOperations extends ApiOperations {
  static _endpoints = {
    counts: '/entities/counts',
    versions: '/entities/versions',
    scrapeRecipe: '/utils/scrape-recipe-schema',
    cleanDeleted: '/entities/clean',
  };
  sessionStore: SessionStore;

  constructor(apiService: ApiService) {
    super(apiService);
    this.sessionStore = apiService.sessionStore;
  }

  /**
   * Récupère les compteurs d'entités depuis l'API
   * @returns {Promise<Object>} compteurs par type d'entité
   */
  async getRemoteCounts(): Promise<EndpointCounts> {
    const context = 'getRemoteCounts';

    try {
      const response = await this.fetchApiUrlWithRetry(
        this.endpoints.counts,
        { method: 'GET' },
        {},
        context,
      );
      return response.json();
    } catch (error) {
      console.error('Error fetching remote counts:', error);
      throw error;
    }
  }

  /**
   * Récupère les références distantes avec métadonnées (UUID + version + dateReceived)
   * @returns {Promise<Object>} Références avec métadonnées par type d'entité
   */
  async getDirtyEntitiesVersions(
    since = '',
  ): Promise<remoteDirtyEntityVersions> {
    const context = 'getDirtyEntitiesVersions';
    let endpointUrl = this.endpoints.versions;
    let lastSyncDate = since;
    if (!since) {
      lastSyncDate = this.sessionStore.state.lastSyncDate;
    }
    if (lastSyncDate) {
      const params = new URLSearchParams();
      params.append('since', new Date(lastSyncDate).toISOString());
      const queryString = params.toString();
      endpointUrl = `${this.endpoints.versions}${queryString ? `?${queryString}` : ''}`;
    }

    try {
      const response = await this.fetchApiUrlWithRetry(
        endpointUrl,
        { method: 'GET' },
        {},
        context,
      );
      const responseData = await response.json();

      return {
        recipes: responseData?.recipes || [],
        ingredients: responseData?.ingredients || [],
        types: responseData?.types || [],
      };
    } catch (error) {
      console.error('Error fetching remote dirty refs:', error);
      throw error;
    }
  }

  // Scrapes recipe from Recipe json schemes from url
  async getRecipesSchemaFromUrl(url = ''): Promise<RecipeSchema[]> {
    if (!url) {
      throw new Error('URL is required to import a recipe.');
    }

    const endpoint = this.endpoints.scrapeRecipe;
    const params = new URLSearchParams();
    params.append('url', encodeURIComponent(url));
    const queryString = params.toString();
    const fullEndpoint = `${endpoint}${queryString ? `?${queryString}` : ''}`;

    try {
      const response = await this.fetchApiUrlWithRetry(fullEndpoint, {
        method: 'GET',
      });
      const data = await response.json();
      if (!data || !data.success) {
        throw new Error(
          data?.message ||
            'Failed to scrape recipe data from the provided URL.',
        );
      } else if (data.recipes) {
        return data.recipes;
      } else {
        return [];
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Nettoie les entités supprimées sur le serveur
   * @returns {Promise<Object>} Liste des UUIDs supprimés par endpoint
   */
  async cleanDeletedEntities(): Promise<{
    success: boolean;
    deleted: { recipes: string[]; ingredients: string[]; types: string[] };
  }> {
    const context = 'cleanDeletedEntities';

    try {
      const response = await this.fetchApiUrlWithRetry(
        this.endpoints.cleanDeleted,
        { method: 'DELETE' },
        {},
        context,
      );
      const data = await response.json();

      if (!data || !data.success) {
        throw new Error(
          data?.message || 'Failed to clean deleted entities on server.',
        );
      }

      return {
        success: true,
        deleted: {
          recipes: data.deleted?.recipes || [],
          ingredients: data.deleted?.ingredients || [],
          types: data.deleted?.types || [],
        },
      };
    } catch (error) {
      console.error('Error cleaning deleted entities:', error);
      throw error;
    }
  }
}
