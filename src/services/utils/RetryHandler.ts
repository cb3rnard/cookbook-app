/**
 * Utility for managing request attempts with retry and backoff
 */
export class RetryHandler {
  static DEFAULT_OPTIONS = {
    retries: 3,
    timeout: 30000,
    backoffFactor: 1000,
    maxBackoff: 10000,
    retryCondition: (error: any) => {
      // ❌ Do NOT retry on client errors (4xx)
      if (error.status >= 400 && error.status < 500) {
        return false; // 400, 401, 403, 404, etc. = client issue, no need to retry
      }

      // ✅ Retry on network and infrastructure errors
      return (
        error.name === 'NetworkError' ||
        error.name === 'TimeoutError' ||
        error.name === 'TypeError' || // Fetch error
        (error.status >= 500 && error.status < 600) || // Server errors
        error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNRESET'
      );
    },
  };

  /**
   * Executes a function with automatic retry
   * @param {Function} operation - Function to execute
   * @param {Object} options - Retry options
   * @param {string} operationName - Name of the operation for logging
   * @returns {Promise} Result of the operation
   */
  static async withRetry(operation: () => Promise<any>, options = {}) {
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    let lastError = null;

    for (let attempt = 1; attempt <= config.retries; attempt++) {
      try {
        // Exécuter l'opération avec timeout
        const result = await this._withTimeout(operation(), config.timeout);
        return result;
      } catch (error) {
        lastError = error;

        // Vérifier si on doit retry
        if (attempt === config.retries || !config.retryCondition(error)) {
          break;
        }

        // Calculer le délai de backoff exponentiel
        const backoffDelay = Math.min(
          config.backoffFactor * Math.pow(2, attempt - 1),
          config.maxBackoff,
        );

        await this._sleep(backoffDelay);
      }
    }

    // Toutes les tentatives ont échoué
    throw lastError;
  }

  /**
   * Wraps a promise with a timeout
   * @private
   */
  static async _withTimeout(promise: Promise<any>, timeoutMs: number) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => {
          const error = new Error(`Operation timed out after ${timeoutMs}ms`);
          error.name = 'TimeoutError';
          reject(error);
        }, timeoutMs);
      }),
    ]);
  }

  /**
   * Pauses execution for a given delay
   * @private
   */
  static _sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Alias for backward compatibility - uses withRetry directly
   */
  static async execute(fn: () => Promise<any>, options = {}) {
    return this.withRetry(fn, options);
  }
}
