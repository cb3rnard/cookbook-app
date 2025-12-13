export const CONFIG = {
  APP_NAME: "Cookbook App",
  VERSION: "1.0.0",

  // Default settings (used as fallback when user hasn't set values)
  DEFAULTS: {
    // Sync settings
    syncDelayMinutes: 120,
    remoteDataRefreshMinutes: 30,
    autoSync: false,

    // API settings
    apiUrl: "",
    apiUser: "",

    // UI settings
    theme: "light",
    language: "fr",

    // Data settings
    cacheMaxAge: 3600, // 1 hour in seconds
  },
  MIN_REFRESH_MINUTES: 1,
};

/**
 * Runtime settings object - SINGLE SOURCE OF TRUTH
 * Initialized with defaults, then merged with user preferences
 * Updated synchronously by SettingsService
 *
 * Usage in components: import { settings } from 'config/config'
 * Usage in scripts: import { settings } from 'config/config'
 *
 * Access: settings.syncDelayMinutes, settings.apiUrl, etc.
 * Updates via SettingsService will automatically reflect here
 */
export const settings = { ...CONFIG.DEFAULTS };
