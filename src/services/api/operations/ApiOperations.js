import { ApiService } from "../ApiService";

export class ApiOperations {
  static _endpoints = {};

  /**
   * @param {ApiService} apiService Instance of the ApiService
   */
  constructor(apiService) {
    this.apiService = apiService;
    this.endpoints = this.constructor._endpoints;
  }

  /**
   * Gets the base API URL
   * @returns {string} The base API URL
   */
  get apiUrl() {
    return this.apiService.apiUrl;
  }

  /********** API SERVICE WRAPPERS **********/

  /**
   * Gets the full endpoint URL with the given UUID
   * @param {string} endpoint The endpoint key
   * @param {string} uuid The UUID to replace in the endpoint
   * @returns {string} The full endpoint URL
   */
  getUuidEndpoint(endpoint, uuid) {
    return this.endpoints[endpoint].replace("{uuid}", uuid);
  }

  /**
   * Fetches the given endpoint
   * @param {string} endpoint The endpoint key
   * @param {Object} options Fetch options
   * @returns {Promise<Object>} The fetch response
   */
  async fetchEndpoint(endpoint, options = {}) {
    return await this.apiService.fetchEndpoint(endpoint, options);
  }

  /**
   * Fetches the given endpoint with retry logic
   * @param {string} endpoint The endpoint key
   * @param {Object} options Fetch options
   * @param {Object} retryOptions Retry options
   * @param {string} context Context for logging
   * @returns {Promise<Object>} The fetch response
   */
  async fetchEndpointWithRetry(
    endpoint,
    options = {},
    retryOptions = {},
    context = "",
  ) {
    return await this.apiService.fetchEndpointWithRetry(
      endpoint,
      options,
      retryOptions,
      context,
    );
  }
}
