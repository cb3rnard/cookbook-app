/**
 * Gestionnaire centralisé des erreurs API pour l'application
 * Responsabilité: Coordonner la gestion des erreurs entre services et UI
 */
import { ApiErrorHandledResult, ApiErrorSummary } from '@src/types/api';
import { ApiPlatformError } from './ApiPlatformError';

export class ApiErrorHandler {
  /**
   * Stratégies de gestion d'erreur par catégorie
   */
  static STRATEGIES = {
    authentication: {
      userMessage: "Problème d'authentification. Reconnectez-vous.",
      shouldLogout: true,
      shouldRetry: false,
      severity: 'error',
    },
    authorization: {
      userMessage: 'Accès non autorisé à cette ressource.',
      shouldLogout: false,
      shouldRetry: false,
      severity: 'warning',
    },
    not_found: {
      userMessage: 'Ressource non trouvée.',
      shouldLogout: false,
      shouldRetry: false,
      severity: 'info',
    },
    validation: {
      userMessage: 'Données invalides.',
      shouldLogout: false,
      shouldRetry: false,
      severity: 'warning',
    },
    server_error: {
      userMessage: 'Erreur serveur. Veuillez réessayer.',
      shouldLogout: false,
      shouldRetry: true,
      severity: 'error',
    },
    client_error: {
      userMessage: 'Erreur dans la requête.',
      shouldLogout: false,
      shouldRetry: false,
      severity: 'warning',
    },
    unknown: {
      userMessage: "Une erreur inattendue s'est produite.",
      shouldLogout: false,
      shouldRetry: true,
      severity: 'error',
    },
  };

  /**
   * Traite une erreur API selon sa catégorie
   * @param {Error|ApiPlatformError} error - Erreur à traiter
   * @param {Object} context - Contexte additionnel
   * @returns {Object} Résultat du traitement avec actions recommandées
   */
  static handleError(error: Error, context = {}): ApiErrorHandledResult {
    const result: ApiErrorHandledResult = {
      originalError: error,
      context,
      timestamp: new Date().toISOString(),
      isApiPlatformError: error instanceof ApiPlatformError,
      category: 'unknown',
      strategy: this.STRATEGIES.unknown as ApiErrorHandledResult['strategy'],
      userMessage: '',
      technicalDetails: {} as ApiErrorSummary,
      actions: {
        shouldLogout: false,
        shouldRetry: false,
        shouldShowToUser: true,
        shouldReport: false,
      },
    };

    // Gestion spécialisée pour ApiPlatformError
    if (error instanceof ApiPlatformError) {
      result.category = error.category;
      result.strategy = (this.STRATEGIES[error.category] ||
        this.STRATEGIES.unknown) as ApiErrorHandledResult['strategy'];
      result.userMessage = this._buildUserMessage(error);
      result.technicalDetails = error.getSummary();

      // Actions basées sur la stratégie
      result.actions.shouldLogout = result.strategy.shouldLogout;
      result.actions.shouldRetry =
        result.strategy.shouldRetry && error.isRetryable;
      result.actions.shouldReport = error.httpStatus >= 500;
    } else {
      // Gestion des erreurs standard JavaScript
      result.userMessage = this._handleStandardError(error);
      result.actions.shouldRetry = this._isNetworkError(error);
      result.strategy = this.STRATEGIES
        .unknown as ApiErrorHandledResult['strategy'];
    }

    // Log selon la sévérité
    this._logError(result);

    return result;
  }

  /**
   * Construit un message utilisateur à partir d'une ApiPlatformError
   * @private
   */
  static _buildUserMessage(apiError: ApiPlatformError) {
    const strategy = this.STRATEGIES[apiError.category];
    let message = strategy.userMessage;

    // Enrichir avec des détails spécifiques
    if (apiError.category === 'validation' && apiError.violations) {
      const validationErrors = apiError.getValidationErrors();
      if (validationErrors.length > 0) {
        const fields = validationErrors
          .map((v) => v.property)
          .filter(Boolean)
          .join(', ');
        message += ` Champs concernés: ${fields}.`;
      }
    }

    if (apiError.category === 'not_found' && apiError.context) {
      message = `${apiError.context} non trouvé(e).`;
    }

    return message;
  }

  /**
   * Gère les erreurs JavaScript standard
   * @private
   */
  static _handleStandardError(error: Error) {
    if (error.name === 'NetworkError' || error.message.includes('fetch')) {
      return 'Problème de connexion réseau. Vérifiez votre connexion.';
    }

    if (error.name === 'TimeoutError') {
      return "L'opération a pris trop de temps. Veuillez réessayer.";
    }

    if (error.message.includes('API offline')) {
      return "L'API n'est pas accessible. Vérifiez l'URL de configuration.";
    }

    return "Une erreur technique s'est produite.";
  }

  /**
   * Détermine si une erreur est liée au réseau
   * @private
   */
  static _isNetworkError(error: Error) {
    const nodeError = error as NodeJS.ErrnoException;
    return (
      error.name === 'NetworkError' ||
      error.name === 'TimeoutError' ||
      nodeError.code === 'ECONNREFUSED' ||
      nodeError.code === 'ENOTFOUND' ||
      error.message.includes('fetch') ||
      error.message.includes('network')
    );
  }

  /**
   * Log l'erreur selon sa sévérité
   * @private
   */
  static _logError(result: ApiErrorHandledResult) {
    const { strategy, originalError, technicalDetails, context } = result;

    const logData = {
      category: result.category,
      context: context,
      message: originalError.message,
      details: technicalDetails,
    };

    switch (strategy.severity) {
      case 'error':
        console.error('API Error:', logData);
        break;
      case 'warning':
        console.warn('API Warning:', logData);
        break;
      case 'info':
        console.info('API Info:', logData);
        break;
      default:
        console.log('API Event:', logData);
    }
  }

  /**
   * Crée une condition de retry compatible avec RetryHandler
   * @static
   */
  static createRetryCondition() {
    return (error: Error) => {
      if (error instanceof ApiPlatformError) {
        return error.isRetryable;
      }

      // Retry les erreurs réseau standard
      return this._isNetworkError(error);
    };
  }

  /**
   * Transforme une erreur en format pour l'UI
   * @static
   */
  static toUiError(error: Error, context = {}) {
    const handled = this.handleError(error, context);

    return {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: handled.userMessage,
      severity: handled.strategy.severity,
      category: handled.category,
      timestamp: handled.timestamp,
      dismissible: true,
      actions: handled.actions,
      details:
        process.env.NODE_ENV === 'development'
          ? handled.technicalDetails
          : null,
    };
  }
}
