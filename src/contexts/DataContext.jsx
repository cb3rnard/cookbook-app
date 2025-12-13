import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { CONFIG } from "../config/config";
import { useSettings } from "../contexts/SettingsContext";
import { useObservableState } from "../hooks/useObservableState";
import { DataService } from "../services/data/DataService";
import { EventBus } from "../services/utils/EventBus";
import { useApi } from "./ApiContext";

const DataContext = createContext();

export function DataProvider({ children }) {
  const { connection } = useApi();
  const { authenticated, available } = connection;
  const { settings } = useSettings();

  const dataService = useMemo(() => new DataService());
  const dataState = useObservableState(dataService.dataStore);
  const { localCounts, remoteCounts } = dataState;

  const getRepository = useCallback(
    (endpoint) => {
      return dataService.repositories.get(endpoint);
    },
    [dataService],
  );

  // Récupération des counts locaux
  const fetchLocalCounts = useCallback(() => {
    dataService.refreshLocalCounts();
  }, [dataService]);

  useEffect(() => {
    // Récupérer les counts locaux au montage
    fetchLocalCounts();
  }, [fetchLocalCounts]);

  // Récupération des counts distants (seulement si API disponible)
  const fetchRemoteCounts = useCallback(async () => {
    if (!authenticated || !available) {
      return;
    }
    dataService.refreshRemoteCounts();
  }, [authenticated, available, dataService]);

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    const refreshDelayMinutes = settings.remoteDataRefreshMinutes
      ? settings.remoteDataRefreshMinutes
      : CONFIG.DEFAULTS.remoteDataRefreshMinutes;

    // Check if we need immediate fetch
    const lastCheckInMinutes = remoteCounts.lastCheck
      ? (Date.now() - remoteCounts.lastCheck) / (60 * 1000)
      : null;

    const shouldFetchNow =
      lastCheckInMinutes === null || lastCheckInMinutes >= refreshDelayMinutes;

    if (shouldFetchNow) {
      fetchRemoteCounts();
    }

    // Setup interval for periodic refresh
    const intervalMs = refreshDelayMinutes * 60 * 1000;
    const interval = setInterval(() => {
      fetchRemoteCounts();
    }, intervalMs);

    return () => {
      clearInterval(interval);
    };
  }, [
    authenticated,
    fetchRemoteCounts,
    remoteCounts.lastCheck,
    settings.remoteDataRefreshMinutes,
  ]);

  // Récupération combinée (locale + distante si possible)
  const refreshAllCounts = useCallback(async () => {
    dataService.refreshAllCounts();
  }, [dataService]);

  useEffect(() => {
    const eventBus = EventBus.getInstance();

    const handleSyncCompleted = (operation) => {
      if (!operation.allFailed) {
        refreshAllCounts();
      }
    };

    eventBus.on("sync:completed", handleSyncCompleted);

    return () => {
      eventBus.off("sync:completed", handleSyncCompleted);
    };
  }, [refreshAllCounts]);

  const totalLocalCounts = {
    all:
      (localCounts.all.recipes || 0) +
      (localCounts.all.ingredients || 0) +
      (localCounts.all.types || 0),
    dirty:
      (localCounts.modified.recipes || 0) +
      (localCounts.modified.ingredients || 0) +
      (localCounts.modified.types || 0) +
      (localCounts.deleted.recipes || 0) +
      (localCounts.deleted.ingredients || 0) +
      (localCounts.deleted.types || 0),
  };

  const totalRemoteCounts = {
    all:
      (remoteCounts.all.recipes || 0) +
      (remoteCounts.all.ingredients || 0) +
      (remoteCounts.all.types || 0),
    dirty:
      (remoteCounts.modified.recipes || 0) +
      (remoteCounts.modified.ingredients || 0) +
      (remoteCounts.modified.types || 0) +
      (remoteCounts.deleted.recipes || 0) +
      (remoteCounts.deleted.ingredients || 0) +
      (remoteCounts.deleted.types || 0),
  };

  const hasLocalChanges = localCounts.hasChanges;
  const hasRemoteChanges = remoteCounts.hasChanges;

  const value = {
    // États bruts
    localCounts,
    remoteCounts,
    totalLocalCounts,
    totalRemoteCounts,

    dataService,
    getRepository,

    // Méthodes de récupération
    fetchLocalCounts,
    fetchRemoteCounts,
    refreshAllCounts,

    // États dérivés
    hasLocalChanges,
    hasRemoteChanges,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
