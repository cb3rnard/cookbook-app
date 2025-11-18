/**
 * Utilitaire pour gérer les tentatives de requêtes avec retry et backoff
 */
export class RetryHandler {
    /**
     * Options par défaut pour les tentatives
     */
    static DEFAULT_OPTIONS = {
        retries: 3,
        timeout: 30000,
        backoffFactor: 1000,
        maxBackoff: 10000,
        retryCondition: (error) => {
            // ❌ Ne PAS retry sur les erreurs client (4xx)
            if (error.status >= 400 && error.status < 500) {
                return false; // 400, 401, 403, 404, etc. = problème client, pas la peine de retry
            }

            // ✅ Retry sur erreurs réseau et infrastructure
            return error.name === 'NetworkError' ||
                error.name === 'TimeoutError' ||
                error.name === 'TypeError' ||  // Erreur fetch
                (error.status >= 500 && error.status < 600) || // Erreurs serveur
                error.code === 'ECONNREFUSED' ||
                error.code === 'ENOTFOUND' ||
                error.code === 'ETIMEDOUT' ||
                error.code === 'ECONNRESET';
        }
    };

    /**
     * Exécute une fonction avec retry automatique
     * @param {Function} operation - Fonction à exécuter
     * @param {Object} options - Options de retry
     * @param {string} operationName - Nom de l'opération pour les logs
     * @returns {Promise} Résultat de l'opération
     */
    static async withRetry(operation, options = {}, operationName = 'operation') {
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
                    config.maxBackoff
                );

                await this._sleep(backoffDelay);
            }
        }

        // Toutes les tentatives ont échoué
        throw lastError;
    }

    /**
     * Enveloppe une promesse avec un timeout
     * @private
     */
    static async _withTimeout(promise, timeoutMs) {
        return Promise.race([
            promise,
            new Promise((_, reject) => {
                setTimeout(() => {
                    const error = new Error(`Operation timed out after ${timeoutMs}ms`);
                    error.name = 'TimeoutError';
                    reject(error);
                }, timeoutMs);
            })
        ]);
    }

    /**
     * Pause l'exécution pendant un délai donné
     * @private
     */
    static _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Alias pour rétrocompatibilité - utilise withRetry directement
     */
    static async execute(fn, options = {}) {
        return this.withRetry(fn, options);
    }
}