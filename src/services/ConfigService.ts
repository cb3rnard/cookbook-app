import type { ConfigKey, ConfigValues, KnownConfig } from '../config/config.js';
import { config, CONFIG_DEFAULTS } from '../config/config.js';
import { storageDatabase as database } from './StorageService.ts';
import { EventBus } from './utils/EventBus.ts';

/**
 * ConfigService - Manages application configuration
 * Merges default values with user-stored preferences from Dexie
 * Updates the runtime config object synchronously
 */
export class ConfigService {
  static _initialized = false;

  /**
   * Initialize config object with user preferences from storage
   * Should be called once at app startup
   */
  static async initialize(): Promise<void> {
    if (this._initialized) return;

    const userSettings = await database.options.toArray();

    // Merge user settings into runtime config
    userSettings.forEach(({ key, value }) => {
      config[key] = value;
    });

    this._initialized = true;
  }

  /**
   * Update runtime config object
   * Called internally after any setting change
   */
  private static _updateRuntimeConfig(key: string, value: unknown): void {
    config[key] = value;
  }

  /**
   * Get a config value (from runtime config object)
   * For known keys, returns typed value
   * For dynamic keys, returns unknown
   */
  static get<K extends ConfigKey>(key: K): KnownConfig[K];
  static get(key: string): unknown;
  static get(key: string): unknown {
    return config[key];
  }

  /**
   * Set a config value
   * Saves to storage and updates runtime config
   * For known keys, value is typed
   * For dynamic keys, accepts any value
   */
  static async set<K extends ConfigKey>(
    key: K,
    value: KnownConfig[K],
  ): Promise<void>;
  static async set(key: string, value: unknown): Promise<void>;
  static async set(key: string, value: unknown): Promise<void> {
    await database.options.put({ uuid: key, key, value });
    this._updateRuntimeConfig(key, value);

    const eventBus = EventBus.getInstance();
    eventBus.emit('config:updated', { key, value });
  }

  /**
   * Update multiple config values at once
   * Saves to storage and updates runtime config
   */
  static async update(settings: Partial<ConfigValues>): Promise<void> {
    const promises = Object.entries(settings).map(([key, value]) =>
      database.options.put({ uuid: key, key, value }),
    );
    await Promise.all(promises);

    // Update runtime config
    Object.entries(settings).forEach(([key, value]) => {
      this._updateRuntimeConfig(key, value);
    });

    const eventBus = EventBus.getInstance();
    eventBus.emit('config:bulkUpdate', settings);
    Object.entries(settings).forEach(([key, value]) => {
      eventBus.emit('config:updated', { key, value });
    });
  }

  /**
   * Delete a config value
   * Removes from storage and restores default value in runtime config
   */
  static async delete(key: string): Promise<void> {
    await database.options.delete(key);

    // Restore default value if it exists
    if (key in CONFIG_DEFAULTS) {
      config[key] = CONFIG_DEFAULTS[key as ConfigKey];
    } else {
      delete config[key];
    }

    const eventBus = EventBus.getInstance();
    eventBus.emit('config:deleted', { key });
  }

  /**
   * Reset all config values to defaults
   * Clears storage and restores all default values in runtime config
   */
  static async reset(): Promise<void> {
    await database.options.clear();

    // Remove all dynamic keys and restore defaults
    Object.keys(config).forEach((key) => {
      if (!['APP_NAME', 'VERSION', 'MIN_REFRESH_MINUTES'].includes(key)) {
        delete config[key];
      }
    });
    Object.assign(config, CONFIG_DEFAULTS);

    const eventBus = EventBus.getInstance();
    eventBus.emit('config:reset', {});
  }

  /**
   * Get all user-configured values (excluding defaults)
   * Useful for export/backup
   */
  static async getUserConfig(): Promise<Record<string, unknown>> {
    const settings = await database.options.toArray();
    return settings.reduce(
      (acc, { key, value }) => {
        acc[key] = value;
        return acc;
      },
      {} as Record<string, unknown>,
    );
  }
}

// Backward compatibility alias
export const SettingsService = ConfigService;
