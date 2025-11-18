import { createContext, useCallback, useContext, useState } from 'react';
import { SettingsService } from '../services/SettingsService';

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const [cachedSettings, setCachedSettings] = useState([]);

  // Return setting key from cache if exists, otherwise fetch from service
  const refreshSettings = useCallback(async () => {
    setCachedSettings([]);
  }, []);

  const getSetting = useCallback(async (key) => {
    if (cachedSettings[key] !== undefined) {
      return cachedSettings[key];
    }
    const setting = await SettingsService.getSetting(key);
    setCachedSettings((prev) => ({ ...prev, [key]: setting }));
    return setting;
  }, [cachedSettings]);

  const getSettings = useCallback(async () => {
    const settings = await SettingsService.getSettings();
    setCachedSettings(settings);
    return settings;
  }, []);

  const setSetting = useCallback(async (key, value) => {
    await SettingsService.updateSetting(key, value);
    setCachedSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateSettings = useCallback(async (newSettings) => {
    await SettingsService.updateSettings(newSettings);
    setCachedSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const getApiCredentialsSettings = useCallback(async () => {
    const apiUrl = await getSetting('apiUrl');
    const apiUser = await getSetting('apiUser');
    return {
      apiUrl: apiUrl || '',
      apiUser: apiUser || '',
    };
  }, []);

  const value = {
    settings: cachedSettings,
    getSetting,
    setSetting,
    updateSettings,
    getApiCredentialsSettings,
    refreshSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};