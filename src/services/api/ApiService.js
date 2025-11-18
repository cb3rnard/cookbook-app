import { DebugService } from '../DebugService.js';
import { EventBus } from '../utils/EventBus.js';
import { RetryHandler } from '../utils/RetryHandler.js';
import { ApiConnectionStatus } from './ApiConnectionStatus.js';
import { ApiPlatformError } from './ApiPlatformError.js';
import { ApiUserSession } from './ApiUserSession.js';

// 🚀 ApiService simple utilisant l'EventBus global
export class ApiService {
    static instance = null;
    static loginEndpoint = '/auth';
    static validateEndpoint = '/token/validate';
    static refreshEndpoint = '/token/refresh';
    
    static getInstance() {
        if (!ApiService.instance) {
            ApiService.instance = new ApiService();
        }
        return ApiService.instance;
    }
    
    get apiBaseUrl() {
        return this.userSession?.apiUrl ? this.userSession.apiUrl.replace(/\/+$/, '') : null;
    }
    
    constructor() {
        if (ApiService.instance) {
            return ApiService.instance;
        }
        ApiService.instance = this;
        
        // 🚀 Utiliser l'EventBus global au lieu d'un EventEmitter dédié
        this.eventBus = EventBus.getInstance();
        
        this.userSession = new ApiUserSession();
        this.connectionStatus = new ApiConnectionStatus(this.userSession);
        this.error = null;
        this.isInitialized = false;
        
        return this;
    }

    /**
     * Émet un changement de status via l'EventBus global
     * 🚀 Pas de méthodes d'événements dans la classe
     */
    _emitStatusChange(beforeEmit) {
        // Exécuter le callback de mise à jour
        if (beforeEmit && typeof beforeEmit === 'function') {
            beforeEmit();
        }
        
        // Émettre via EventBus global
        this.eventBus.emit('api:statusChange', {
            service: 'apiService',
            connectionStatus: this.connectionStatus,
            apiService: this
        });
    }
    
    async init() {
        console.log('Initializing ApiService...');
        if (this.isInitialized) {
            return this; // Déjà initialisé
        }
        await this.connectionStatus.initialize();
        await this.checkConnection();
        
        // Met à jour les flags après chargement complet
        this.isInitialized = true;
        
        return this;
    }

    async checkConnection() {
        if(this.connectionStatus.online) {
            if (this.userSession.apiUrl && this.userSession.user.id) {
                const isApiOnline = await this.ping();
                
                if (!isApiOnline) return;
                    
                await this.validateConnection();
            }
        } else {
            this._emitStatusChange(() => {
                this.connectionStatus.setOnline(false);
            });
        }
    }
    
    // Ping simple pour vérifier si l'API répond
    async ping() {
        if (!this.apiBaseUrl) {
            return false;
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/ping`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            
            // 🚀 Émettre le changement via EventBus global
            this._emitStatusChange(() => {
                this.connectionStatus.setAvailable(true);
            });
            
            return response.ok;
        } catch (error) {
            // 🚀 Émettre le changement via EventBus global
            this._emitStatusChange(() => {
                this.connectionStatus.setAvailable(false);
            });
            
            return false;
        }
    }
    
    async login(apiUrl = null, apiUser = null, apiPassword = null) {
        if (!apiUrl || !apiUser || !apiPassword) {
            throw new Error('apiUrl, apiUser and apiPassword must be provided for login');
        }
        
        try {
            const response = await fetch(`${apiUrl}${ApiService.loginEndpoint}`, {
                method: 'POST',
                credentials: 'include', // Pour recevoir les cookies httpOnly
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: apiUser, password: apiPassword })
            });
            
            if (!response.ok) {
                throw new Error(`Erreur lors de l'authentification: ${response.status} ${response.statusText}`);
            }
            
            const user = await response.json();
            
            this.userSession.setSession(user, apiUrl);

            return this.userSession.user;
        } catch (error) {
            throw error;
        }
    }
    
    // Valide un token avec l'API
    async validateConnection() {
        if (!this.apiBaseUrl) {
            return false;
        }
        
        
        const response = await this.fetchEndpoint(ApiService.validateEndpoint, {
            method: 'GET'
        });
        
        // 401 après refresh = vraiment déconnecté
        if (response.status === 401) {
            this._emitStatusChange(() => {
                this.connectionStatus.setDisconnected(true);
            });
            return false;
        }
        
        // Autres erreurs HTTP
        if (!response.ok) {
            const errorType = response.status >= 500 ? 'server' : 'client';
            this._emitStatusChange(() => {
                this.connectionStatus.setAuthenticated(false);
                this.connectionStatus.setError(true);
            });
            
            // throw new Error(`API error (${response.status}): ${response.statusText}`, {
            //     cause: { type: errorType, status: response.status }
            // });
        }

        this._emitStatusChange(() => {
            this.connectionStatus.setAuthenticated(true);
        });
        return true;
    }
    
    async refreshAuth() {
        try {
            
            const response = await fetch(`${this.apiBaseUrl}${ApiService.refreshEndpoint}`, {
                method: 'POST',
                credentials: 'include', // 🚀 Pour recevoir le nouveau cookie httpOnly
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
            });
            
            // 401 = refresh token invalide -> nettoyer et déconnecter
            if (response.status === 401) {
                this._emitStatusChange(() => {
                    this.connectionStatus.setDisconnected(true);
                });
                throw new Error('Refresh token invalid', { cause: { type: 'authentication', status: 401 } });
            }
            
            // Autres erreurs HTTP
            if (!response.ok) {
                const errorType = response.status >= 500 ? 'server' : 'client';
                this._emitStatusChange(() => {
                    this.connectionStatus.setError(true);
                    this.connectionStatus.setAuthenticated(false);
                });
                throw new Error(`Refresh failed (${response.status}): ${response.statusText}`, {
                    cause: { type: errorType, status: response.status }
                });
            }

            this._emitStatusChange(() => {
                this.connectionStatus.setAuthenticated(true);
                this.connectionStatus.setError(false);
            });
            
            return true
        } catch (error) {
            console.error('Error during token refresh:', error);
            // Erreur réseau = API offline
            if (error.name === 'TypeError' || error.message.includes('fetch')) {
                throw new Error('API offline during refresh', { cause: { type: 'network' } });
            }
            
            // Re-lancer les autres erreurs (y compris les 401)
            return false;
        }
    }

    async logout() {
        // 🚀 Nettoyer côté client ET serveur pour invalider les cookies
        try {
            // await fetch(`${this.apiBaseUrl}/auth/logout`, {
            //     method: 'POST',
            //     credentials: 'include' // Pour envoyer les cookies à invalider
            // });
        } catch (error) {
            // Continuer même si le logout serveur échoue
            console.warn('Server logout failed:', error);
        }

        this.userSession.clearSession();
    }
    
    async fetchEndpoint(endpoint, options = {}) {
        // 🚀 Plus besoin de vérifier l'access token - il est dans le cookie httpOnly
        
        // Headers de base (plus d'Authorization - dans le cookie!)
        const headersOptions = {
            'Accept': 'application/ld+json, application/json'
        };
        
        // Content-Type pour les requêtes avec body (sauf FormData)
        const method = options.method || 'GET';
        if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && options.body && !(options.body instanceof FormData)) {
            headersOptions['Content-Type'] = 'application/ld+json';
        }
        
        const headers = {
            ...headersOptions,
            ...(options.headers || {})
        };
        
        // Encoder le body en JSON si nécessaire
        let body = options.body;
        if (headers['Content-Type'] === 'application/ld+json' && body && typeof body === 'object') {
            body = JSON.stringify(body);
        }
        
        const fetchOptions = {
            ...options,
            credentials: 'include', // Envoie automatiquement les cookies httpOnly
            headers,
            body
        };
        
        // Nettoyer les options internes avant le fetch
        delete fetchOptions._isRetry;
        
        const response = await fetch(`${this.apiBaseUrl}${endpoint}`, fetchOptions);
        
        
        // 401 = token expiré, tenter refresh automatique UNE SEULE FOIS
        if (response.status === 401 && !options._isRetry) {
            try {
                console.log('Access token expired, attempting to refresh...');
                const refreshSuccessful = await this.refreshAuth();
                if (!refreshSuccessful) {
                    throw new Error('Refresh failed');
                }
                console.log('Token refreshed successfully, retrying original request...');
                
                // Retry avec les mêmes options (le nouveau token est maintenant en cookie)
                const retryOptions = {
                    ...options,
                    credentials: 'include',
                    headers,
                    body,
                    _isRetry: true
                };
                
                const retryResponse = await fetch(`${this.apiBaseUrl}${endpoint}`, retryOptions);
                
                // Si le retry échoue aussi avec 401, on est vraiment déconnecté
                if (retryResponse.status === 401) {
                    this.user.isAuthenticated = false;
                }
                
                return retryResponse;
                
            } catch (refreshError) {
                return response; // Retourner la réponse 401 originale
            }
        }
        
        return response;
    }
        
    /**
    * Gère les réponses API et transforme les erreurs en ApiPlatformError
    * @private
    */
    async _handleApiResponse(response, context = null) {
        DebugService.apiLog(`API Response [${response.status}]`, {
            url: response.url,
            status: response.status,
            context
        });
        
        // Réponse OK : retourner directement
        if (response.ok) {
            return response;
        }
        
        // Cas spécial 304 Not Modified : pas une erreur, mais pas de body
        if (response.status === 304) {
            DebugService.apiLog(`304 Not Modified - content unchanged`, { url: response.url, context });
            // Crée une réponse fictive avec un body vide pour éviter les erreurs dans response.json()
            return new Response('null', {
                status: 200,
                statusText: 'OK (Not Modified)',
                headers: response.headers
            });
        }
        
        // Réponse d'erreur : créer une ApiPlatformError
        const apiError = await ApiPlatformError.fromResponse(response, context);
        
        // Log détaillé pour debugging
        await DebugService.error(['API Error occurred', {
            url: response.url,
            status: response.status,
            context
        }]);
        
        // Logs additionnels selon le type d'erreur
        if (apiError.category === 'validation' && apiError.violations) {
            console.warn('Validation errors:', apiError.getValidationErrors());
        }
        
        throw apiError;
    }
    
    /**
    * Méthode fetchEndpoint avec retry automatique
    * @param {string} endpoint - Endpoint à appeler
    * @param {Object} options - Options de fetch
    * @param {Object} retryOptions - Options de retry personnalisées
    * @param {string} context - Contexte pour les logs
    * @returns {Promise<Response>} Réponse HTTP
    */
    async fetchEndpointWithRetry(endpoint, options = {}, retryOptions = {}, context = '') {
        const response = await RetryHandler.withRetry(async () => {
            return this.fetchEndpoint(endpoint, options);
        }, {
            retries: 3,
            timeout: 30000,
            retryCondition: (error) => {
                // Utilise la logique intelligente d'ApiPlatformError si disponible
                if (error instanceof ApiPlatformError) {
                    return error.isRetryable;
                }
                return true; // Fallback sur la logique par défaut du RetryHandler
            },
            ...retryOptions
        }, context || `${options.method || 'GET'} ${endpoint}`);
        
        // Gestion automatique des erreurs et transformation en ApiPlatformError
        await this._handleApiResponse(response, context);
        return response;
    }
    
    getUser() {
        return this.user || {
            email: this.email,
            name: 'Utilisateur'
        };
    }
}