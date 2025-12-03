import { ApiOperations } from "./ApiOperations.js";

export class AuthApiOperations extends ApiOperations {
  static _endpoints = {
    login: "/auth",
    validate: "/token/validate",
    refresh: "/token/refresh",
  };

  constructor(apiService) {
    super(apiService);
    this.sessionStore = this.apiService.sessionStore;
    this.connectionStore = this.apiService.connectionStore;
  }

  async login(apiUrl = null, apiUser = null, apiPassword = null) {
    this.connectionStore.setConnecting(true);
    if (!this.connectionStore.online) {
      return false;
    }

    if (!apiUrl || !apiUser || !apiPassword) {
      throw new Error(
        "apiUrl, apiUser and apiPassword must be provided for login",
      );
    }
    const endpointUrl = `${apiUrl}${this.endpoints.login}`;

    try {
      const response = await fetch(endpointUrl, {
        method: "POST",
        credentials: "include", // To receive httpOnly cookies
        headers: {
          "Content-Type": "application/json",
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

      return await this.validateAuth();
    } catch (error) {
      throw error;
    }
  }

  // Valide un token avec l'API
  async validateAuth() {
    this.connectionStore.setConnecting(true);
    const response = await this.fetchEndpoint(this.endpoints.validate, {
      method: "GET",
    });

    // 401 après refresh = vraiment déconnecté
    if (response.status === 401) {
      this.connectionStore.setDisconnected(true);
      return false;
    }

    // Autres erreurs HTTP
    if (!response.ok) {
      const errorType = response.status >= 500 ? "server" : "client";
      this.connectionStore.setAuthenticated(false);
      this.connectionStore.setError(true);
      return false;
    }

    this.connectionStore.setAuthenticated(true);
    this.connectionStore.setAuthenticated(true);
    this.connectionStore.setConnecting(false);
    return true;
  }

  async refreshAuth() {
    try {
      const endpointUrl = `${this.apiUrl}${this.endpoints.refresh}`;
      const response = await fetch(endpointUrl, {
        method: "POST",
        credentials: "include", // 🚀 Pour recevoir le nouveau cookie httpOnly
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      // 401 = refresh token invalide -> nettoyer et déconnecter
      if (response.status === 401) {
        this.connectionStore.setDisconnected(true);
        throw new Error("Refresh token invalid", {
          cause: { type: "authentication", status: 401 },
        });
      }

      // Autres erreurs HTTP
      if (!response.ok) {
        const errorType = response.status >= 500 ? "server" : "client";
        this.connectionStore.setError(true);
        this.connectionStore.setAuthenticated(false);
        throw new Error(
          `Refresh failed (${response.status}): ${response.statusText}`,
          {
            cause: { type: errorType, status: response.status },
          },
        );
      }

      this.connectionStore.setError(false);
      this.connectionStore.setAuthenticated(true);

      return true;
    } catch (error) {
      console.error("Error during token refresh:", error);
      // Erreur réseau = API offline
      if (error.name === "TypeError" || error.message.includes("fetch")) {
        throw new Error("API offline during refresh", {
          cause: { type: "network" },
        });
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
      console.warn("Server logout failed:", error);
    }

    this.sessionStore.clearSession();
    this.connectionStore.resetConnection(true);
    this.connectionStore.setDisconnected(true);
  }
}
