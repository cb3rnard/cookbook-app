import { ConnectionStore } from '@src/services/stores/ConnectionStore.js';
import { SessionStore } from '@src/services/stores/SessionStore.js';
import { ApiService } from '../ApiService.js';
import { ApiOperations } from './ApiOperations.js';

export class AuthApiOperations extends ApiOperations {
  sessionStore: SessionStore;
  connectionStore: ConnectionStore;

  static _endpoints = {
    login: '/auth',
    validate: '/token/validate',
    refresh: '/token/refresh',
  };

  constructor(apiService: ApiService) {
    super(apiService);
    this.sessionStore = this.apiService.sessionStore;
    this.connectionStore = this.apiService.connectionStore;
  }

  async login(
    apiUrl: string,
    apiUser: string,
    apiPassword: string,
  ): Promise<boolean> {
    this.connectionStore.setConnecting(true);
    if (!this.connectionStore.online) {
      return false;
    }

    if (!apiUrl || !apiUser || !apiPassword) {
      throw new Error('apiUrl, user and password must be provided for login');
    }
    const endpointUrl = `${apiUrl}${this.endpoints.login}`;

    const response = await fetch(endpointUrl, {
      method: 'POST',
      credentials: 'include', // To receive httpOnly cookies
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: apiUser, password: apiPassword }),
    });

    if (!response.ok) {
      throw new Error(
        `Erreur lors de l'authentification: ${response.status} ${response.statusText}`,
      );
    }

    const user = await response.json();
    this.sessionStore.saveSession(user, apiUrl);
    this.connectionStore.setConnecting(true);

    return this.validateAuth();
  }

  // Valide un token avec l'API
  async validateAuth(): Promise<boolean> {
    this.connectionStore.setConnecting(true);
    const response = await this.fetchApiUrl(this.endpoints.validate, {
      method: 'GET',
    });

    // 401 après refresh = vraiment déconnecté
    if (response.status === 401) {
      this.connectionStore.setDisconnected(true);
      return false;
    }

    // Autres erreurs HTTP
    if (!response.ok) {
      // const errorType = response.status >= 500 ? "server" : "client";
      this.connectionStore.setAuthenticated(false);
      this.connectionStore.setError(true);
      return false;
    }

    this.connectionStore.setAuthenticated(true);
    this.connectionStore.setAuthenticated(true);
    this.connectionStore.setConnecting(false);
    return true;
  }

  async refreshAuth(): Promise<boolean> {
    try {
      const endpointUrl = `${this.apiUrl}${this.endpoints.refresh}`;
      const response = await fetch(endpointUrl, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      // 401 = refresh token invalide -> nettoyer et déconnecter
      if (response.status === 401) {
        this.connectionStore.setDisconnected(true);
        throw new Error('Refresh token invalid');
      }

      // Autres erreurs HTTP
      if (!response.ok) {
        this.connectionStore.setError(true);
        this.connectionStore.setAuthenticated(false);
        throw new Error(
          `Refresh failed (${response.status}): ${response.statusText}`,
        );
      }

      this.connectionStore.setError(false);
      this.connectionStore.setAuthenticated(true);

      return true;
    } catch (error) {
      console.error('Error during token refresh:', error);
      // Erreur réseau = API offline
      if (
        error instanceof TypeError ||
        (error instanceof Error && error.message.includes('fetch'))
      ) {
        throw new Error('API offline during refresh');
      }

      // Re-lancer les autres erreurs (y compris les 401)
      return false;
    }
  }

  async logout() {
    try {
      // await fetch(`${this.apiUrl}/auth/logout`, {
      //     method: 'POST',
      //     credentials: 'include' // Pour envoyer les cookies à invalider
      // });
    } catch (error) {
      // Continuer même si le logout serveur échoue
      console.warn('Server logout failed:', error);
    }

    this.sessionStore.clearSession();
    this.connectionStore.resetConnection();
    this.connectionStore.setDisconnected(true);
  }
}
