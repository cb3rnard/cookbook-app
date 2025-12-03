import { ApiOperations } from "./ApiOperations.js";

export class BaseApiOperations extends ApiOperations {
  static _endpoints = {
    ping: "/ping",
  };

  // Simple ping to check API availability
  async ping() {
    if (!this.apiUrl) {
      return false;
    }

    const endpointUrl = `${this.apiUrl}${this.endpoints.ping}`;

    try {
      const response = await fetch(endpointUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      this.apiService.connectionStore.setAvailable(true);
      return response.ok;
    } catch (error) {
      this.apiService.connectionStore.setAvailable(false);
      return false;
    }
  }
}
