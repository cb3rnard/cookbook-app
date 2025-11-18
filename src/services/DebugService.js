import { SettingsService } from './SettingsService';

/**
 * Service de debug global, synchrone et performant
 * 
 * NOUVEAU : Plus d'await nécessaire ! Utilisation directe :
 * - DebugService.debug('message', 'api')
 * - DebugService.enableGlobalDebug() // Active TOUT
 * - DebugService.enableContext('api') // Active juste l'API
 */
export class DebugService {
    // États de debug SYNCHRONES (simplifié)
    static _globalDebugEnabled = false;
    static _contextDebugEnabled = new Set(); // Set des contextes activés

    // Cache settings (mis à jour en arrière-plan)
    static _cachedSettings = null;
    static _settingsLoaded = false;

    // Initialisation asynchrone en arrière-plan
    static _initPromise = null;    /**
     * Initialise le debug en chargeant les settings en arrière-plan
     * Appelé automatiquement au premier usage
     */
    static _init() {
        if (this._initPromise) return this._initPromise;

        this._initPromise = this._loadSettings();
        return this._initPromise;
    }

    static async _loadSettings() {
        try {
            this._cachedSettings = await SettingsService.getSettings();
            this._settingsLoaded = true;

            // Appliquer les settings de debug
            if (this._cachedSettings?.debug) {
                const debugSettings = this._cachedSettings.debug;

                // Debug global ?
                if (debugSettings.global === true) {
                    this._globalDebugEnabled = true;
                }

                // Contextes spécifiques ?
                if (debugSettings.contexts && Array.isArray(debugSettings.contexts)) {
                    this._contextDebugEnabled = new Set(debugSettings.contexts);
                }
            }
        } catch (error) {
            console.warn('[DEBUG] Impossible de charger les settings:', error);
            this._settingsLoaded = true; // Continue sans settings
        }
    }

    /**
     * NOUVELLES méthodes de contrôle SYNCHRONES
     */
    static enableGlobalDebug() {
        this._globalDebugEnabled = true;
        console.info('[DEBUG] 🟢 Debug GLOBAL activé');
    }

    static disableGlobalDebug() {
        this._globalDebugEnabled = false;
        console.info('[DEBUG] 🔴 Debug GLOBAL désactivé');
    }

    static enableContext(context) {
        this._contextDebugEnabled.add(context);
        console.info(`[DEBUG] 🟢 Debug activé pour: ${context}`);
    }

    static disableContext(context) {
        this._contextDebugEnabled.delete(context);
        console.info(`[DEBUG] 🔴 Debug désactivé pour: ${context}`);
    }

    /**
     * Vérifie si le debug est activé pour un contexte donné (SYNCHRONE!)
     * @param {string} context - Le contexte de debug (ex: 'api', 'sync', 'storage')
     * @returns {boolean} - true si le debug est activé
     */
    static isDebugEnabled(context) {
        // Initialisation si pas encore fait (en arrière-plan)
        if (!this._settingsLoaded) {
            this._init();
        }

        // Debug global activé ?
        if (this._globalDebugEnabled) {
            return true;
        }

        // Debug spécifique au contexte ?
        return this._contextDebugEnabled.has(context);
    }    /**
     * Log un message de debug si le contexte est activé (SYNCHRONE!)
     * @param {*} log - Le message ou objet à logger
     * @param {string} context - Le contexte de debug
     * @param {string} level - Le niveau de log (log, info, warn, error)
     */
    static debug(log, context = '', level = 'log') {
        if (!this.isDebugEnabled(context)) {
            return;
        }

        const prefix = `[${context.toUpperCase()}]`;
        const consoleMethod = console[level] || console.log;
        const timestamp = new Date().toLocaleTimeString();

        if (typeof log === 'object') {
            consoleMethod(`${prefix} ${timestamp}`, log);
        } else {
            consoleMethod(`${prefix} ${timestamp} - ${log}`);
        }
    }

    /**
     * Raccourcis pour différents niveaux de log (SYNCHRONES!)
     */
    static log(log, context) {
        return this.debug(log, context, 'log');
    }

    static info(log, context) {
        return this.debug(log, context, 'info');
    }

    static warn(log, context) {
        return this.debug(log, context, 'warn');
    }

    static error(log, context) {
        return this.debug(log, context, 'error');
    }

    /**
     * Raccourcis contextuels SYNCHRONES (plus besoin d'await!)
     */
    static apiLog(...log) {
        return this.debug(log.length === 1 ? log[0] : log, 'api');
    }

    static syncLog(...log) {
        return this.debug(log.length === 1 ? log[0] : log, 'sync');
    }

    static storageLog(...log) {
        return this.debug(log.length === 1 ? log[0] : log, 'storage');
    }

    static entityLog(...log) {
        return this.debug(log.length === 1 ? log[0] : log, 'entity');
    }

    static componentLog(...log) {
        return this.debug(log.length === 1 ? log[0] : log, 'component');
    }

    /**
     * Debug pour les erreurs (SYNCHRONE!)
     */
    static errorContext(message, error, context) {
        const errorData = {
            message,
            error: error.message || error,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };
        return this.debug(errorData, context, 'error');
    }

    /**
     * Utilitaire pour mesurer les performances (SYNCHRONE)
     */
    static time(label, context, fn) {
        const start = performance.now();

        try {
            const result = fn();

            // Si c'est une Promise, on gère async
            if (result && typeof result.then === 'function') {
                return result
                    .then(res => {
                        const end = performance.now();
                        const duration = Math.round((end - start) * 100) / 100;
                        this.info(`⏱️ ${label}: ${duration}ms`, context);
                        return res;
                    })
                    .catch(error => {
                        const end = performance.now();
                        const duration = Math.round((end - start) * 100) / 100;
                        this.error(`❌ ${label} failed after ${duration}ms: ${error.message}`, context);
                        throw error;
                    });
            }

            // Fonction synchrone
            const end = performance.now();
            const duration = Math.round((end - start) * 100) / 100;
            this.info(`⏱️ ${label}: ${duration}ms`, context);
            return result;

        } catch (error) {
            const end = performance.now();
            const duration = Math.round((end - start) * 100) / 100;
            this.error(`❌ ${label} failed after ${duration}ms: ${error.message}`, context);
            throw error;
        }
    }



    /**
     * Liste tous les contextes de debug actifs
     */
    static getActiveContexts() {
        const activeContexts = [];

        // Debug global activé ?
        if (this._globalDebugEnabled) {
            activeContexts.push('global');
        }

        // Contextes spécifiques activés
        this._contextDebugEnabled.forEach(context => {
            activeContexts.push(context);
        });

        return activeContexts;
    }
}