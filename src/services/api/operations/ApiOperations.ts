import { ApiFetchOptions } from '@src/types/api';
import { ApiService } from '../ApiService';

export class ApiOperations {
  static _endpoints: Record<string, string> = {};
  apiService: ApiService;
  endpoints: Record<string, string>;

  /**
   * @param {ApiService} apiService Instance of the ApiService
   */
  constructor(apiService: ApiService) {
    this.apiService = apiService;
    this.endpoints = (this.constructor as typeof ApiOperations)._endpoints;
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
  getUuidEndpoint(endpoint: string, uuid: string): string {
    return this.endpoints[endpoint].replace('{uuid}', uuid);
  }

  /**
   * Fetches the given endpoint
   * @param {string} endpoint The endpoint key
   * @param {Object} options Fetch options
   * @returns {Promise<Object>} The fetch response
   */
  async fetchApiUrl(endpoint: string, options: ApiFetchOptions = {}) {
    return this.apiService.fetchApiUrl(endpoint, options);
  }

  /**
   * Fetches the given endpoint with retry logic
   * @param {string} endpoint The endpoint key
   * @param {Object} options Fetch options
   * @param {Object} retryOptions Retry options
   * @param {string} context Context for logging
   * @returns {Promise<Object>} The fetch response
   */
  async fetchApiUrlWithRetry(
    endpoint: string,
    options: ApiFetchOptions = {},
    retryOptions: Record<string, any> = {},
    context = '',
  ) {
    return this.apiService.fetchApiUrlWithRetry(
      endpoint,
      options,
      retryOptions,
      context,
    );
  }
}
