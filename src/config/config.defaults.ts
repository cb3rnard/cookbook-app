/**
 * Default configuration values
 * Used as fallback when user hasn't set custom values
 */
export const CONFIG_DEBUG_STATES = {
  debugDefault: false,
  debugApi: false,
  debugStorage: false,
  debugSync: false,
  debugComponent: false,
};
export const CONFIG_DEBUG = {
  // Debug settings
  showDebugControls: false,
  debugGlobal: false,
  ...CONFIG_DEBUG_STATES,
};

export const CONFIG_DEFAULTS = {
  // Sync settings
  SYNC_DELAY_MIN: 120,
  REMOTE_DATA_REFRESH_MIN: 30,

  // API settings
  apiUrl: '',
  apiUser: '',

  // UI settings
  theme: 'light' as const,
  language: 'fr' as const,

  // Data settings
  cacheMaxAge: 3600, // 1 hour in seconds
  ...CONFIG_DEBUG,
} as const;
