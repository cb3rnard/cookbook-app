import { CONFIG, settings } from "../config/config";
import { storageDatabase as database } from "./StorageService";
import { EventBus } from "./utils/EventBus";

export class SettingsService {
  static _initialized = false;

  /**
   * Initialize settings object with user preferences
   * Should be called once at app startup
   */
  static async initialize() {
    if (this._initialized) return;

    const userSettings = await this.getSettings();
    Object.assign(settings, userSettings);
    this._initialized = true;
  }

  /**
   * Update settings runtime object and emit event
   * Called internally after any setting change
   */
  static _updateRuntimeSettings(key, value) {
    settings[key] = value;
  }
  /**
   * Gets a setting value, falling back to CONFIG.DEFAULTS if not set by user
   * @param {string} key Setting key
   * @param {boolean} useDefault Whether to use CONFIG.DEFAULTS as fallback (default: true)
   * @returns {Promise<any>} Setting value, default, or null
   */
  static async getSetting(key, useDefault = true) {
    const setting = await database.options.get(key);

    if (setting) {
      return setting.value;
    }

    // Fallback to CONFIG.DEFAULTS if enabled
    if (useDefault && key in CONFIG.DEFAULTS) {
      return CONFIG.DEFAULTS[key];
    }

    return null;
  }

  static async setSetting(key, value) {
    await database.options.put({ uuid: key, key, value });
    this._updateRuntimeSettings(key, value);
    const eventBus = EventBus.getInstance();
    eventBus.emit("setting:updated", { key, value });
  }

  /**
   * Gets all settings merged with CONFIG.DEFAULTS
   * User settings override defaults
   * @param {boolean} useDefaults Whether to merge with CONFIG.DEFAULTS (default: true)
   * @returns {Promise<Object>} Complete settings object
   */
  static async getSettings(useDefaults = true) {
    const settings = await database.options.toArray();
    const userSettings = settings.reduce((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {});

    // Merge with defaults if enabled
    if (useDefaults) {
      return { ...CONFIG.DEFAULTS, ...userSettings };
    }

    return userSettings;
  }

  static async updateSettings(newSettings) {
    const promises = Object.entries(newSettings).map(([key, value]) =>
      database.options.put({ uuid: key, key, value }),
    );
    await Promise.all(promises);

    // Update runtime settings
    Object.entries(newSettings).forEach(([key, value]) => {
      this._updateRuntimeSettings(key, value);
    });

    const eventBus = EventBus.getInstance();
    eventBus.emit("settings:updated", newSettings);
    Object.entries(newSettings).forEach(([key, value]) => {
      eventBus.emit("setting:updated", { key, value });
    });
  }

  static async deleteSetting(key) {
    await database.options.delete(key);
    const eventBus = EventBus.getInstance();
    eventBus.emit("setting:deleted", key);
  }

  static async resetSettings() {
    await database.options.clear();

    // Reset runtime settings to defaults
    Object.keys(settings).forEach((key) => delete settings[key]);
    Object.assign(settings, CONFIG.DEFAULTS);

    const eventBus = EventBus.getInstance();
    eventBus.emit("settings:reset");
  }
}
