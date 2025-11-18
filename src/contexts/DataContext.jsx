import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { EventBus } from '../services';
import { DataService } from '../services/data/DataService';
import { useApi } from './ApiContext';
import { useSettings } from './SettingsContext';

const DataContext = createContext();

const countsModel = {
  all: { recipes: 0, ingredients: 0, types: 0 },
  dirty: { recipes: 0, ingredients: 0, types: 0 },
  dirtyUuids: { recipes: [], ingredients: [], types: [] },
  hasChanges: false,
  loading: false,
  error: null
};

export function DataProvider({ children }) {
  const { connection } = useApi();
  const { isAuthenticated, available } = connection;
  const { settings = {}, getSetting } = useSettings();
  const [autoSync, setAutoSync] = useState(false);
  const [eventBus] = useState(() => EventBus.getInstance());

  useEffect(() => {
    const fetchAutoSync = async () => {
      const sync = await getSetting('autoSync');
      setAutoSync(sync);
    };
    fetchAutoSync();
  }, []);

  useEffect(() => {
    const checkAutoSync = async ({ key, value }) => {
      if (key === 'autoSync') {
        setAutoSync(value);
      }
    };
    // eventBus.on('sync:updated', refreshHandler);
    eventBus.on('setting:updated', checkAutoSync);
    return () => {
      // eventBus.off('sync:updated', refreshHandler);
      eventBus.off('setting:updated', checkAutoSync);
    };
  }, [eventBus]);

  // Nouveau DataService avec le status de connexion actuel
  const dataService = useMemo(() => {
    const service = DataService.getInstance(connection);
    // Mettre à jour le status de connexion quand le contexte API change
    service.setConnectionStatus(connection);
    return service;
  }, [connection]);

  // Initialiser DataService de manière asynchrone au démarrage
  const [isDataServiceInitialized, setIsDataServiceInitialized] = useState(false);

  useEffect(() => {
    const initializeDataService = async () => {
      if (!dataService || isDataServiceInitialized) return;

      try {
        await dataService.initialize();
        setIsDataServiceInitialized(true);
      } catch (error) {
        console.error('Failed to initialize DataService:', error);
        // Ne pas bloquer l'app, continuer avec les services non initialisés
        setIsDataServiceInitialized(true);
      }
    };

    initializeDataService();
  }, [dataService, isDataServiceInitialized]);

  // 🚀 Récupérer SyncService depuis DataService (plus de duplication)
  const syncService = useMemo(() => {
    return dataService?.getSyncService() || null;
  }, [dataService]);

  const getRepository = useCallback((endpoint) => {
    if (!dataService) return null;
    return dataService.repositories.get(endpoint);
  }, [dataService]);

  // États des counts locaux (toujours disponibles)
  const [localCounts, setLocalCounts] = useState(countsModel);

  // États des counts distants (seulement si API connectée)
  const [remoteCounts, setRemoteCounts] = useState({
    ...countsModel,
    available: false // Indique si les données sont disponibles
  });

  // Récupération des counts locaux
  const fetchLocalCounts = useCallback(async () => {
    setLocalCounts(prev => ({ ...prev, loading: true, error: null }));

    const counts = await dataService.getLocalCounts();
    setLocalCounts(prev => ({
      ...prev,
      ...counts,
      loading: false,
      error: null
    }));
    return counts;
  }, [dataService]);

  // Récupération des counts distants (seulement si API disponible)
  const fetchRemoteCounts = useCallback(async () => {
    if (!isAuthenticated || !available) {
      setRemoteCounts(prev => ({
        ...prev,
        available: false,
        error: {
          title: 'API indisponible',
          message: isAuthenticated
            ? 'Le serveur n\'est pas accessible.'
            : 'Connexion API requise.'
        }
      }));
      return null;
    }

    setRemoteCounts(prev => ({ ...prev, loading: true, error: null }));

    const counts = await dataService.getRemoteCounts();
    setRemoteCounts({
      ...counts,
      available: true,
      loading: false,
    });
  }, [isAuthenticated]);

  // Récupération combinée (locale + distante si possible)
  const refreshAllCounts = useCallback(async () => {
    try {
      setLocalCounts(prev => ({ ...prev, loading: true, error: null }));
      // Toujours récupérer les counts locaux
      const localData = await dataService.getLocalCounts();
      setLocalCounts(prev => ({
        ...prev,
        ...localData,
        loading: false
      }));
      // Récupérer les counts distants seulement si l'API est disponible
      let remoteData = null;
      setRemoteCounts(prev => ({ ...prev, loading: true, error: null }));
      if (isAuthenticated && available) {
        remoteData = await dataService.getRemoteCounts();
        setRemoteCounts(prev => ({
          ...prev,
          ...remoteData,
          loading: false
        }));
      }

      return { local: localData, remote: remoteData };

    } catch (error) {
      console.error('Erreur lors du refresh des counts:', error);
      throw error;
    }
  }, [isAuthenticated, available]);

  // Méthodes utiles pour les composants
  const getEntityCounts = (endpoint, source = 'local') => {
    const counts = source === 'local' ? localCounts : remoteCounts;
    return {
      all: counts.all[endpoint] || 0,
      dirty: counts.dirty[endpoint] || 0,
      dirtyUuids: counts.dirtyUuids[endpoint] || []
    };
  };

  const getTotalCounts = (source = 'local') => {
    const counts = source === 'local' ? localCounts : remoteCounts;
    return {
      all: (counts.all.recipes || 0) + (counts.all.ingredients || 0) + (counts.all.types || 0),
      dirty: (counts.dirty.recipes || 0) + (counts.dirty.ingredients || 0) + (counts.dirty.types || 0)
    };
  };

  const hasLocalChanges = localCounts.hasChanges;
  const hasRemoteChanges = remoteCounts.hasChanges && remoteCounts.available;
  const isRemoteAvailable = remoteCounts.available;

  const value = {
    // États bruts
    localCounts,
    remoteCounts,

    dataService,
    syncService,
    getRepository,

    // Méthodes de récupération
    fetchLocalCounts,
    fetchRemoteCounts,
    refreshAllCounts,

    // Utilitaires
    getEntityCounts,
    getTotalCounts,

    // États dérivés
    hasLocalChanges,
    hasRemoteChanges,
    isRemoteAvailable,

    // Loading states
    isLocalLoading: localCounts.loading,
    isRemoteLoading: remoteCounts.loading,
    isAnyLoading: localCounts.loading || remoteCounts.loading,

    // Initialization state
    isDataServiceInitialized
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

/**
 * Hook unifié pour accéder aux données et états de data
 * Remplace useDataService avec une API plus riche
 */
export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

/**
 * Hook simplifié pour accéder uniquement à DataService
 * Utilise le contexte si disponible
 */
export function useDataService() {
  const context = useContext(DataContext);
  if (!context) {
    console.warn('useDataService used outside DataProvider, using singleton fallback');
    return DataService.getInstance();
  }
  return context.dataService;
}