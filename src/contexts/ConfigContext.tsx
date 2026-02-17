import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { config } from '../config/config.ts';
import { ConfigService } from '../services/ConfigService.ts';
import { EventBus } from '../services/utils/EventBus.ts';

export interface ConfigContext {
  // Accès direct à l'objet config (lecture seule dans les composants)
  config: typeof config;
  // Méthodes de mutation (provoquent un re-render via des événements)
  setConfig: (key: string, value: any) => Promise<void>;
  updateConfig: (newSettings: Partial<typeof config>) => Promise<void>;
  resetConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContext | undefined>(undefined);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  // Force re-render when config changes
  const [, setTrigger] = useState(0);

  useEffect(() => {
    const eventBus = EventBus.getInstance();

    const handleConfigUpdate = () => {
      setTrigger((prev) => prev + 1);
    };

    eventBus.on('config:updated', handleConfigUpdate);
    eventBus.on('config:bulkUpdate', handleConfigUpdate);
    eventBus.on('config:reset', handleConfigUpdate);
    eventBus.on('config:deleted', handleConfigUpdate);

    return () => {
      eventBus.off('config:updated', handleConfigUpdate);
      eventBus.off('config:bulkUpdate', handleConfigUpdate);
      eventBus.off('config:reset', handleConfigUpdate);
      eventBus.off('config:deleted', handleConfigUpdate);
    };
  }, []);

  const setConfig = useCallback(async (key: string, value: any) => {
    await ConfigService.set(key, value);
  }, []);

  const updateConfig = useCallback(
    async (newSettings: Partial<typeof config>) => {
      await ConfigService.update(newSettings);
    },
    [],
  );

  const resetConfig = useCallback(async () => {
    await ConfigService.reset();
  }, []);

  const value = {
    // Direct access to config object (read-only in components)
    config,
    // Mutation methods (trigger re-render via events)
    setConfig,
    updateConfig,
    resetConfig,
  };

  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}
