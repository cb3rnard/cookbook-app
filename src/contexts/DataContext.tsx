import { CountsModel } from '@src/types/data.ts';
import {
  GetRepositoryInterface,
  SyncRepository,
} from '@src/types/repositories.ts';
import { DataState } from '@src/types/states.ts';
import { SyncOperationState } from '@src/types/sync.ts';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import { CONFIG_DEFAULTS, Endpoint } from '../config/config.ts';
import { useObservableState } from '../hooks/useObservableState.ts';
import { DataService } from '../services/data/DataService.ts';
import { EventBus } from '../services/utils/EventBus.ts';
import { useApi } from './ApiContext.jsx';
import { useConfig } from './ConfigContext.js';

export interface DataContext {
  // États bruts
  localCounts: CountsModel;
  remoteCounts: CountsModel;
  totalLocalCounts: {
    all: number;
    dirty: number;
  };
  totalRemoteCounts: {
    all: number;
    dirty: number;
  };
  dataService: DataService;
  getRepository: GetRepositoryInterface;

  // Méthodes de récupération
  fetchLocalCounts: () => Promise<void>;
  fetchRemoteCounts: () => Promise<void>;
  refreshAllCounts: () => Promise<void>;
  cleanDeletedSyncedEntities: () => Promise<{
    success: boolean;
    totalDeleted: number;
    deletedFromApi: Record<string, string[]>;
  }>;

  // États dérivés
  hasLocalChanges: boolean;
  hasRemoteChanges: boolean;
}

const DataContext = createContext<DataContext | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { connection } = useApi();
  const { authenticated, available } = connection;
  const { config } = useConfig();

  const dataService = useMemo(() => new DataService(), []);
  const dataState = useObservableState<DataState>(dataService.dataStore);
  const { localCounts, remoteCounts } = dataState;

  const getRepository: GetRepositoryInterface = useCallback(
    ((endpoint: Endpoint) => {
      return dataService.repositories.get(endpoint);
    }) as GetRepositoryInterface,
    [dataService],
  );

  // Récupération des counts locaux
  const fetchLocalCounts = useCallback(async () => {
    dataService.refreshLocalCounts();
  }, [dataService]);

  useEffect(() => {
    // Récupérer les counts locaux au montage
    fetchLocalCounts();

    const eventBus = EventBus.getInstance();
    eventBus.on('app:clear', fetchLocalCounts);

    return () => {
      eventBus.off('app:clear', fetchLocalCounts);
    };
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

    const refreshDelayMinutes = config.REMOTE_DATA_REFRESH_MIN
      ? config.REMOTE_DATA_REFRESH_MIN
      : CONFIG_DEFAULTS.REMOTE_DATA_REFRESH_MIN;

    // Check if we need immediate fetch
    const diffTime = remoteCounts.lastCheck
      ? Date.now() - new Date(remoteCounts.lastCheck).getTime()
      : null;
    const lastCheckInMinutes =
      diffTime !== null ? Math.floor(diffTime / (1000 * 60)) : null;

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
    config.REMOTE_DATA_REFRESH_MIN,
  ]);

  // Récupération combinée (locale + distante si possible)
  const refreshAllCounts = useCallback(async () => {
    dataService.refreshAllCounts();
  }, [dataService]);

  useEffect(() => {
    const eventBus = EventBus.getInstance();

    const handleSyncCompleted = (operation: SyncOperationState) => {
      if (!operation.totals.allFailed) {
        refreshAllCounts();
      }
    };

    eventBus.on('sync:completed', handleSyncCompleted);

    return () => {
      eventBus.off('sync:completed', handleSyncCompleted);
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

  /**
   * Nettoie les entités supprimées et synchronisées
   * Supprime les entités locales supprimées et sync, et les entités supprimées côté API
   */
  const cleanDeletedSyncedEntities = useCallback(async () => {
    // Vérifier que la sync est à jour avant de permettre le nettoyage
    if (hasLocalChanges || hasRemoteChanges) {
      throw new Error(
        'Cannot clean deleted entities: synchronization is not up to date. Please sync first.',
      );
    }

    // Rafraîchir les counts avant l'opération
    await refreshAllCounts();

    // Double vérification après refresh
    const currentLocalCounts = dataService.dataStore.state.localCounts;
    const currentRemoteCounts = dataService.dataStore.state.remoteCounts;

    if (currentLocalCounts.hasChanges || currentRemoteCounts.hasChanges) {
      throw new Error(
        'Cannot clean deleted entities: synchronization is not up to date after refresh. Please sync first.',
      );
    }

    try {
      // Appeler l'API pour nettoyer les entités supprimées côté serveur
      const result =
        await dataService.apiService.operations.global.cleanDeletedEntities();

      if (!result.success) {
        throw new Error('Failed to clean deleted entities on server.');
      }

      const deletedUuids = result.deleted;

      // 1. Supprimer les entités locales supprimées ET synchronisées (hard delete)
      const endpoints = config.ENDPOINTS_SYNCABLE;
      let totalDeleted = 0;

      for (const endpoint of endpoints) {
        const repository = dataService.getRepository(
          endpoint,
        ) as SyncRepository;
        if (!repository)
          throw new Error(`Repository not found for endpoint: ${endpoint}`);

        // Récupérer toutes les entités supprimées (dateDeleted != null)
        const deletedEntities = await repository.getDeleted();

        // Supprimer en dur
        for (const entity of deletedEntities) {
          await repository.delete(entity.uuid, '', true);
          totalDeleted++;
        }
      }

      // 2. Supprimer les entités locales non modifiées mais supprimées côté API
      for (const endpoint of endpoints) {
        const repository = dataService.getRepository(
          endpoint,
        ) as SyncRepository;
        if (!repository)
          throw new Error(`Repository not found for endpoint: ${endpoint}`);
        const apiDeletedUuids = deletedUuids[endpoint] || [];

        if (apiDeletedUuids.length === 0) continue;

        // Récupérer les entités locales correspondantes
        const localEntities = await repository.getAllBy(
          'uuid',
          apiDeletedUuids,
        );

        // Supprimer en dur
        for (const entity of localEntities) {
          await repository.delete(entity.uuid, '', true);
          totalDeleted++;
        }
      }

      // 3. Delete unlinked images
      const imageRepository = dataService.images;
      const recipeRepository = dataService.recipes;
      const imagesUuids = await imageRepository.getAllUuids();
      const linkedRecipes = await recipeRepository.getAllBy(
        'imageUuid',
        imagesUuids,
      );
      for (const imageUuid of imagesUuids) {
        const isLinked = linkedRecipes.some(
          (recipe) => recipe.imageUuid === imageUuid,
        );
        if (!isLinked) {
          await imageRepository.delete(imageUuid, true);
          totalDeleted++;
        }
      }

      // Rafraîchir les counts après nettoyage
      await refreshAllCounts();

      return {
        success: true,
        totalDeleted,
        deletedFromApi: deletedUuids,
      };
    } catch (error) {
      console.error('Error cleaning deleted synced entities:', error);
      throw error;
    }
  }, [hasLocalChanges, hasRemoteChanges, refreshAllCounts, dataService]);

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
    cleanDeletedSyncedEntities,

    // États dérivés
    hasLocalChanges,
    hasRemoteChanges,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
