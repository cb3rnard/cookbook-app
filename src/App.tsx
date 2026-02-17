import { Flex, FlexProps } from '@radix-ui/themes';
import { useEffect, useMemo, useState } from 'react';
import { GlobalUI } from './components/layout/GlobalUI.tsx';
import { Header } from './components/layout/Header.tsx';
import { OverlayManager } from './components/OverlayManager.tsx';
import { ApiProvider } from './contexts/ApiContext.tsx';
import { ConfigProvider } from './contexts/ConfigContext.js';
import { DataProvider } from './contexts/DataContext.tsx';
import { RecipeProvider } from './contexts/RecipesContext.tsx';
import { SyncProvider } from './contexts/SyncContext.tsx';
import { ViewProvider, useView } from './contexts/ViewContext.tsx';
import { PWABadge } from './PWABadge.tsx';
import { ConfigService } from './services/ConfigService.ts';
import { StorageService } from './services/StorageService.ts';
import { StorageEstimate } from './types/storage.ts';
import { RecipesView } from './views/RecipesView.tsx';

function App() {
  const [configInitialized, setConfigInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize config FIRST before any providers that use it
        await ConfigService.initialize();
        setConfigInitialized(true);
      } catch (error) {
        console.error('Failed to initialize config:', error);
        setConfigInitialized(true); // Still proceed even if init fails
      }
    };

    initialize();
  }, []);

  if (!configInitialized) {
    return null; // Don't render providers until config is ready
  }

  return (
    <ConfigProvider>
      <ViewProvider>
        <ApiProvider>
          <DataProvider>
            <SyncProvider>
              <RecipeProvider>
                <Content />
                <GlobalUI />
              </RecipeProvider>
            </SyncProvider>
          </DataProvider>
        </ApiProvider>
      </ViewProvider>
    </ConfigProvider>
  );
}

function Content() {
  const { uiState, currentOverlayView } = useView();
  const lockView = useMemo(
    () => uiState?.hasModal || currentOverlayView,
    [uiState, currentOverlayView],
  );

  // State management
  const [storageInfo, setStorageInfo] = useState<StorageEstimate | undefined>(
    undefined,
  );
  const [isPersistent, setIsPersistent] = useState(false);

  // Initialize app
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    // Config is already initialized in App component
    // Just setup storage and other runtime stuff here
    try {
      // Request persistent storage
      const persistent = await StorageService.requestPersistentStorage();
      setIsPersistent(persistent);

      // Get storage info
      const storage = await StorageService.getStorageEstimate();
      setStorageInfo(storage);
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  };

  useEffect(() => {
    const fetchStorageInfo = async () => {
      try {
        const storage = await StorageService.getStorageEstimate();
        setStorageInfo(storage);
      } catch (error) {
        console.error('Failed to fetch storage info:', error);
      }
    };

    fetchStorageInfo();
  }, []);

  const mainProps = useMemo(() => {
    const props: FlexProps = {};
    if (lockView) {
      props['maxHeight'] = '100%';
      props['overflow'] = 'hidden';
    }
    return props;
  }, [lockView]);

  return (
    <Flex direction="column" height="100vh" {...mainProps}>
      <Header
        title="Cookbook"
        storageInfo={storageInfo}
        isPersistent={isPersistent}
      />
      <RecipesView overflow="hidden" />
      <OverlayManager />
      <PWABadge />
    </Flex>
  );
}

export default App;
