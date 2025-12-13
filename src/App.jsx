import { Flex } from "@radix-ui/themes";
import { useEffect, useMemo, useState } from "react";
import { GlobalUI } from "./components/layout/GlobalUI";
import { Header } from "./components/layout/Header";
import { OverlayManager } from "./components/OverlayManager";
import { ApiProvider } from "./contexts/ApiContext";
import { DataProvider } from "./contexts/DataContext";
import { RecipeProvider } from "./contexts/RecipesContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { SyncProvider } from "./contexts/SyncContext";
import { ViewProvider, useView } from "./contexts/ViewContext";
import { PWABadge } from "./PWABadge";
import { SettingsService } from "./services/SettingsService";
import { StorageService } from "./services/StorageService";
import { RecipesView } from "./views/RecipesView";

function App() {
  return (
    <SettingsProvider>
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
    </SettingsProvider>
  );
}

function Content() {
  const { uiState, currentOverlayView } = useView();
  const lockView = useMemo(
    () => uiState?.hasModal || currentOverlayView,
    [uiState, currentOverlayView],
  );

  // State management
  const [storageInfo, setStorageInfo] = useState(null);
  const [isPersistent, setIsPersistent] = useState(false);

  // Initialize app
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize settings (load user preferences into CONFIG.settings)
      await SettingsService.initialize();

      // Request persistent storage
      const persistent = await StorageService.requestPersistentStorage();
      setIsPersistent(persistent);

      // Get storage info
      const storage = await StorageService.getStorageEstimate();
      setStorageInfo(storage);
    } catch (error) {
      console.error("Failed to initialize app:", error);
    }
  };

  useEffect(() => {
    const fetchStorageInfo = async () => {
      try {
        const storage = await StorageService.getStorageEstimate();
        setStorageInfo(storage);
      } catch (error) {
        console.error("Failed to fetch storage info:", error);
      }
    };

    fetchStorageInfo();
  }, []);

  const mainProps = useMemo(() => {
    const props = {
      maxHeight: lockView ? "100%" : null,
      overflow: lockView ? "hidden" : null,
    };
    // Remove null values
    Object.keys(props).forEach(
      (key) => props[key] === null && delete props[key],
    );
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
