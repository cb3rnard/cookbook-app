import { config } from '../config/config';

const DebugContexts = {
  DEFAULT: '',
  API: 'api',
  STORAGE: 'storage',
  SYNC: 'sync',
  COMPONENT: 'component',
};

export type DebugContext = (typeof DebugContexts)[keyof typeof DebugContexts];

/**
 * Synchronous debug service using runtime configuration
 */
export class DebugService {
  /**
   * Available debug contexts
   */
  static CONTEXTS = DebugContexts;

  /**
   * Checks if debug is enabled for a given context
   * @param {string} context - The debug context ('default', 'api', 'sync', 'storage', 'component')
   * @returns {boolean} - true if debug is enabled
   */
  static isDebugEnabled(context: DebugContext): boolean {
    // Is global debug enabled?
    if (config.debugGlobal === true) {
      return true;
    }

    // Handle default context (empty string)
    if (context === '' || context === 'default') {
      return config.debugDefault === true;
    }

    // Is debug enabled for the specific context?
    const contextKey = `debug${context.charAt(0).toUpperCase()}${context.slice(1)}`;
    return config[contextKey] === true;
  }

  /**
   * Logs a debug message if the context is enabled
   * @param {*} log - The message or object to log
   * @param {string} context - The debug context
   * @param {string} level - The log level (log, info, warn, error)
   */
  static debug(
    context: DebugContext,
    log: string,
    level: 'log' | 'info' | 'warn' | 'error' = 'log',
    data?: any,
  ): void {
    if (!this.isDebugEnabled(context)) {
      return;
    }

    const prefix = `[${context.toUpperCase()}]`;
    const consoleMethod = console[level] || console.log;
    const timestamp = new Date().toLocaleTimeString();

    const methodAttributes = [`${prefix} ${timestamp} -- ${log}`];
    if (data !== undefined) {
      methodAttributes.push(data);
    }

    consoleMethod(...methodAttributes);
  }

  /**
   * Raccourcis pour différents niveaux de log
   */
  static log(context: DebugContext, log: string, data?: any) {
    return this.debug(context, log, 'log', data);
  }

  static info(context: DebugContext, log: string, data?: any) {
    return this.debug(context, log, 'info', data);
  }

  static warn(context: DebugContext, log: string, data?: any) {
    return this.debug(context, log, 'warn', data);
  }

  static error(context: DebugContext, log: string, data?: any) {
    return this.debug(context, log, 'error', data);
  }

  /**
   * Liste tous les contextes de debug actifs
   */
  static getActiveContexts() {
    const activeContexts = [];

    // Debug global activé ?
    if (config.debugGlobal) {
      activeContexts.push('global');
    }

    // Contextes spécifiques
    Object.values(this.CONTEXTS).forEach((context) => {
      const contextKey = `debug${context.charAt(0).toUpperCase()}${context.slice(1)}`;
      if (config[contextKey]) {
        activeContexts.push(context);
      }
    });

    return activeContexts;
  }
}
