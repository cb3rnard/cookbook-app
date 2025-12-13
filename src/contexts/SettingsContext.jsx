import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { settings } from "../config/config";
import { SettingsService } from "../services/SettingsService";
import { EventBus } from "../services/utils/EventBus";

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  // Force re-render when settings change
  const [, setTrigger] = useState(0);

  useEffect(() => {
    const eventBus = EventBus.getInstance();

    const handleSettingUpdate = () => {
      setTrigger((prev) => prev + 1);
    };

    eventBus.on("setting:updated", handleSettingUpdate);
    eventBus.on("settings:updated", handleSettingUpdate);
    eventBus.on("settings:reset", handleSettingUpdate);

    return () => {
      eventBus.off("setting:updated", handleSettingUpdate);
      eventBus.off("settings:updated", handleSettingUpdate);
      eventBus.off("settings:reset", handleSettingUpdate);
    };
  }, []);

  const setSetting = useCallback(async (key, value) => {
    await SettingsService.setSetting(key, value);
  }, []);

  const updateSettings = useCallback(async (newSettings) => {
    await SettingsService.updateSettings(newSettings);
  }, []);

  const resetSettings = useCallback(async () => {
    await SettingsService.resetSettings();
  }, []);

  const value = {
    // Direct access to settings object (read-only in components)
    settings,
    // Mutation methods (trigger re-render via events)
    setSetting,
    updateSettings,
    resetSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
