/**
 * Classe d'erreur personnalisée pour gérer les réponses d'erreur API Platform
 * Responsabilité: Parser et structure les erreurs API au format Hydra/JSON-LD
 */
export class ApiPlatformError extends Error {
    constructor(responseData, httpStatus = null, context = null) {
        // Message principal basé sur title ou detail
        const message = responseData?.title || responseData?.detail || 'Unknown API error';
        super(message);

        this.name = 'ApiPlatformError';
        this.httpStatus = httpStatus || responseData?.status || 500;
        this.apiType = responseData?.['@type'] || 'Error';
        this.apiId = responseData?.['@id'] || null;
        this.context = context || null;

        // Détails spécifiques API Platform
        this.title = responseData?.title || null;
        this.detail = responseData?.detail || null;
        this.description = responseData?.description || null;
        this.errorType = responseData?.type || null;

        // Stack trace du serveur (utile pour debug)
        this.serverTrace = responseData?.trace || null;

        // Metadata additionnelles
        this.violations = responseData?.violations || null; // Pour les erreurs de validation
        this.hydraContext = responseData?.['@context'] || null;

        // Données brutes pour accès complet
        this.rawResponse = responseData;

        // Classification de l'erreur
        this.category = this._categorizeError();
        this.isRetryable = this._isRetryable();
    }

    /**
     * Catégorise l'erreur selon son type et code HTTP
     * @private
     */
    _categorizeError() {
        if (this.httpStatus >= 400 && this.httpStatus < 500) {
            if (this.httpStatus === 401) return 'authentication';
            if (this.httpStatus === 403) return 'authorization';
            if (this.httpStatus === 404) return 'not_found';
            if (this.httpStatus === 422) return 'validation';
            return 'client_error';
        }

        if (this.httpStatus >= 500) {
            return 'server_error';
        }

        return 'unknown';
    }

    /**
     * Détermine si l'erreur est retry-able
     * @private
     */
    _isRetryable() {
        // Erreurs serveur (5xx) : retry possible
        if (this.httpStatus >= 500) return true;

        // Autres erreurs client : pas de retry par défaut
        if (this.httpStatus >= 400) return false;

        return true;
    }

    /**
     * Retourne un résumé lisible de l'erreur
     */
    getSummary() {
        return {
            message: this.message,
            status: this.httpStatus,
            category: this.category,
            context: this.context,
            detail: this.detail,
            isRetryable: this.isRetryable
        };
    }

    /**
     * Retourne les violations de validation (si présentes)
     */
    getValidationErrors() {
        if (!this.violations) return [];

        return this.violations.map(violation => ({
            property: violation.propertyPath || null,
            message: violation.message || null,
            code: violation.code || null,
            value: violation.invalidValue || null
        }));
    }

    /**
     * Crée une ApiPlatformError depuis une Response fetch
     * @static
     */
    static async fromResponse(response, context = null) {
        let responseData = {};

        try {
            // Tenter de parser le JSON même en cas d'erreur HTTP
            responseData = await response.json();
        } catch (parseError) {
            // Si le parsing JSON échoue, créer une erreur générique
            responseData = {
                title: `HTTP ${response.status}`,
                detail: response.statusText || 'Unknown error',
                status: response.status
            };
        }

        return new ApiPlatformError(responseData, response.status, context);
    }

    /**
     * Vérifie si une réponse contient une erreur API Platform
     * @static
     */
    static isApiPlatformError(responseData) {
        return responseData && (
            responseData['@type'] === 'Error' ||
            responseData['@context']?.includes('/api/contexts/Error') ||
            (responseData.status && responseData.title && responseData.detail)
        );
    }

    /**
     * Convertit l'erreur en objet sérialisable pour logging
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            httpStatus: this.httpStatus,
            category: this.category,
            context: this.context,
            title: this.title,
            detail: this.detail,
            errorType: this.errorType,
            violations: this.violations,
            isRetryable: this.isRetryable,
            serverTrace: this.serverTrace ? this.serverTrace.slice(0, 3) : null // Limiter la trace pour le logging
        };
    }
}