export class ApiOperations {
  static _endpoints = {};

  constructor(apiService) {
    this.apiService = apiService;
    this.endpoints = this.constructor._endpoints;
  }

  get apiUrl() {
    return this.apiService.apiUrl;
  }

  /********** API SERVICE WRAPPERS **********/
  getUuidEndpoint(endpoint, uuid) {
    return this.endpoints[endpoint].replace("{uuid}", uuid);
  }

  fetchEndpoint(endpoint, options = {}) {
    return this.apiService.fetchEndpoint(endpoint, options);
  }

  fetchEndpointWithRetry(
    endpoint,
    options = {},
    retryOptions = {},
    context = "",
  ) {
    return this.apiService.fetchEndpointWithRetry(
      endpoint,
      options,
      retryOptions,
      context,
    );
  }
}
