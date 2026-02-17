import { ApiFetchOptions } from '@src/types/api.js';
import { DebugService } from '../DebugService.js';
import { ConnectionStore } from '../stores/ConnectionStore.js';
import { SessionStore } from '../stores/SessionStore.js';
import { RetryHandler } from '../utils/RetryHandler.js';
import { ApiPlatformError } from './ApiPlatformError.js';
import { AuthApiOperations } from './operations/AuthApiOperations.js';
import { BaseApiOperations } from './operations/BaseApiOperations.js';
import { EntityApiOperations } from './operations/EntityApiOperations.js';
import { GlobalApiOperations } from './operations/GlobalApiOperations.js';
import { ImageApiOperations } from './operations/ImageApiOperation.js';
import { RecipeApiOperations } from './operations/RecipeApiOperations.js';

export class ApiService {
  static _instance?: ApiService;

  sessionStore!: SessionStore;
  connectionStore!: ConnectionStore;
  operations!: {
    base: BaseApiOperations;
    auth: AuthApiOperations;
    global: GlobalApiOperations;
    entity: EntityApiOperations;
    image: ImageApiOperations;
    recipe: RecipeApiOperations;
  };

  constructor() {
    if (ApiService._instance) {
      return ApiService._instance;
    }

    // Initialiser les stores
    this.sessionStore = new SessionStore();
    this.connectionStore = new ConnectionStore(this.sessionStore);

    this.operations = {
      base: new BaseApiOperations(this),
      auth: new AuthApiOperations(this),
      global: new GlobalApiOperations(this),
      entity: new EntityApiOperations(this),
      image: new ImageApiOperations(this),
      recipe: new RecipeApiOperations(this),
    };

    ApiService._instance = this;
  }

  get apiUrl() {
    return this.sessionStore.apiUrl || null;
  }

  async checkConnection() {
    this.connectionStore.setConnecting(true);
    const sessionState = this.sessionStore.getState();
    if (navigator.onLine) {
      this.connectionStore.setOnline(true);

      if (sessionState.active) {
        const isApiOnline = await this.operations.base.ping();

        if (!isApiOnline) return;

        await this.operations.auth.validateAuth();
      }
    } else {
      this.connectionStore.setOnline(false);
    }
    this.connectionStore.setConnecting(false);
  }

  async fetchApiUrl(endpoint: string, options: ApiFetchOptions = {}) {
    if (!this.apiUrl) {
      throw new Error('API base URL is not defined.');
    }

    const endpointUrl = `${this.apiUrl}${endpoint}`;

    const headersOptions: Record<string, string> = {
      Accept: 'application/ld+json, application/json',
    };

    // Content-Type pour les requêtes avec body (sauf FormData)
    const method = options.method || 'GET';
    if (
      ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) &&
      options.body &&
      !(options.body instanceof FormData)
    ) {
      headersOptions['Content-Type'] = 'application/ld+json';
    }

    const headers = {
      ...headersOptions,
      ...(options.headers || {}),
    };

    // Encoder le body en JSON si nécessaire
    let body: BodyInit | null | undefined = options.body as
      | BodyInit
      | null
      | undefined;
    if (
      headers['Content-Type'] === 'application/ld+json' &&
      body &&
      typeof body === 'object' &&
      !(body instanceof FormData) &&
      !(body instanceof URLSearchParams) &&
      !(body instanceof Blob)
    ) {
      body = JSON.stringify(body);
    }

    const fetchOptions: RequestInit = {
      method: options.method,
      credentials: 'include' as RequestCredentials, // Envoie automatiquement les cookies httpOnly
      headers,
      body,
    };

    // Nettoyer les options internes avant le fetch
    (fetchOptions as any)._isRetry = options._isRetry;

    const response = await fetch(endpointUrl, fetchOptions);

    // 401 = token expiré, tenter refresh automatique UNE SEULE FOIS
    if (response.status === 401 && !options._isRetry) {
      try {
        const refreshSuccessful = await this.operations.auth.refreshAuth();
        if (!refreshSuccessful) {
          throw new Error('Refresh failed');
        }

        // Retry avec les mêmes options (le nouveau token est maintenant en cookie)
        const retryFetchOptions: RequestInit = {
          method: options.method,
          credentials: 'include' as RequestCredentials,
          headers,
          body,
        };

        const retryResponse = await fetch(
          `${this.apiUrl}${endpoint}`,
          retryFetchOptions,
        );

        // Si le retry échoue aussi avec 401, on est vraiment déconnecté
        if (retryResponse.status === 401) {
          this.connectionStore.setExpired(true);
        }

        return retryResponse;
      } catch (refreshError) {
        return response; // Retourner la réponse 401 originale
      }
    }

    return response;
  }

  /**
   * Méthode fetchApiUrl avec retry automatique
   * @param {string} endpoint - Endpoint à appeler
   * @param {Object} options - Options de fetch
   * @param {Object} retryOptions - Options de retry personnalisées
   * @param {string} context - Contexte pour les logs
   * @returns {Promise<Response>} Réponse HTTP
   */
  async fetchApiUrlWithRetry(
    endpoint: string,
    options: ApiFetchOptions = {},
    retryOptions: ApiFetchOptions = {},
    context = '',
  ) {
    const response = await RetryHandler.withRetry(
      async () => {
        return this.fetchApiUrl(endpoint, options);
      },
      {
        retries: 3,
        timeout: 30000,
        retryCondition: (error: unknown) => {
          // Utilise la logique intelligente d'ApiPlatformError si disponible
          if (error instanceof ApiPlatformError) {
            return error.isRetryable;
          }
          return true; // Fallback sur la logique par défaut du RetryHandler
        },
        ...retryOptions,
      },
    );

    // Gestion automatique des erreurs et transformation en ApiPlatformError
    await this._handleApiResponse(response, context);
    return response;
  }

  /**
   * Gère les réponses API et transforme les erreurs en ApiPlatformError
   * @private
   */
  async _handleApiResponse(response: Response, context = '') {
    DebugService.log('api', `API Response [${response.status}]`, {
      url: response.url,
      status: response.status,
      context,
    });

    // Réponse OK : retourner directement
    if (response.ok) {
      return response;
    }

    // Cas spécial 304 Not Modified : pas une erreur, mais pas de body
    if (response.status === 304) {
      DebugService.log('api', `304 Not Modified - content unchanged`, {
        url: response.url,
        context,
      });
      // Crée une réponse fictive avec un body vide pour éviter les erreurs dans response.json()
      return new Response('null', {
        status: 200,
        statusText: 'OK (Not Modified)',
        headers: response.headers,
      });
    }

    // Réponse d'erreur : créer une ApiPlatformError
    const apiError = await ApiPlatformError.fromResponse(response, context);

    // Log détaillé pour debugging
    await DebugService.error('api', 'API Error occurred', {
      url: response.url,
      status: response.status,
      context,
    });

    // Logs additionnels selon le type d'erreur
    if (apiError.category === 'validation' && apiError.violations) {
      console.warn('Validation errors:', apiError.getValidationErrors());
    }

    throw apiError;
  }
}
