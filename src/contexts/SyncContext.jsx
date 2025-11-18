import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SyncConflictsService } from '../services/sync/SyncConflictsService';
import { EventBus } from '../services/utils/EventBus.js';
import { delayExecution } from '../services/utils/GlobalUtils';
import { useApi } from './ApiContext';
import { useData } from './DataContext';

const SyncContext = createContext();

export const SyncProvider = ({ children }) => {
  const { connection } = useApi();
  const { isAuthenticated, canSync } = connection || {};
  const { localCounts, remoteCounts, refreshAllCounts, syncService, isDataServiceInitialized } = useData();

  // 🚀 Récupérer statusService depuis syncService (une seule source de vérité)
  const statusService = useMemo(() => {
    return syncService?.getStatusService() || null;
  }, [syncService]);

  // 🚀 État du status (initialisé seulement quand statusService est disponible)
  const [status, setStatus] = useState(() => {
    return statusService?.getStatus() || {
      autoSync: false,
      isSyncing: false,
      lastSync: null,
      syncProgress: { current: 0, total: 0, operation: null },
      errors: [],
      conflicts: [],
      results: null,
      isSyncOver: false
    };
  });

  // 🚀 Écouter les changements de status via EventBus global uniquement
  useEffect(() => {
    if (!statusService || !isDataServiceInitialized) return;
    
    // Mettre à jour le status initial
    setStatus(statusService.getStatus());

    // 🚀 Écouter via EventBus global
    const eventBus = EventBus.getInstance();
    
    const handleSyncStatusChange = (eventData) => {
      if (eventData.service === 'syncStatusService') {
        setStatus(eventData.status);
      }
    };
    
    eventBus.on('sync:statusChange', handleSyncStatusChange);
    
    return () => {
      eventBus.off('sync:statusChange', handleSyncStatusChange);
    };
  }, [statusService, isDataServiceInitialized]);

  // Détection des conflits basée sur les données du DataContext
  const conflicts = SyncConflictsService.detectConflicts(
    localCounts.dirtyUuids,
    remoteCounts.dirtyUuids
  );
  const hasDirtyConflicts = conflicts.hasConflicts;

  // Écouter les événements de sync (seulement si authentifié)
  useEffect(() => {
    if (!isAuthenticated || !syncService) return;

    // Écouter les événements SyncService et les transférer à statusService
    const eventBus = syncService.eventBus;

    const handleSyncStart = (data) => {
    };

    const handleSyncProgress = (data) => {
    };

    const handleSyncComplete = (results) => {
      // Actualiser les counts après sync
      refreshAllCounts();
    };

    const handleSyncError = (error) => {
      statusService.addError(error);
    };

    eventBus.on('sync:started', handleSyncStart);
    eventBus.on('sync:progress', handleSyncProgress);
    eventBus.on('incrementalSync:completed', handleSyncComplete);
    eventBus.on('fullSync:completed', handleSyncComplete);
    eventBus.on('sync:error', handleSyncError);

    return () => {
      eventBus.off('sync:started', handleSyncStart);
      eventBus.off('sync:progress', handleSyncProgress);
      eventBus.off('incrementalSync:completed', handleSyncComplete);
      eventBus.off('fullSync:completed', handleSyncComplete);
      eventBus.off('sync:error', handleSyncError);
    };
  }, [isAuthenticated, refreshAllCounts, syncService]);

  // Actions de synchronisation (délèguent à SyncService)
  const sync = useCallback(async (delay = 0, conflictStrategy = 'LAST_WRITE_WINS', incremental = false) => {
    if (!isAuthenticated) {
      throw new Error('Cannot sync: not authenticated.');
    }

    if (status.isSyncing) {
      throw new Error('Sync already in progress.');
    }

    try {
      await delayExecution(delay);
      const results = await syncService.sync(delay, conflictStrategy, incremental);
      return results;
    } catch (error) {
      throw error;
    }
  }, [isAuthenticated, status.isSyncing, syncService]);

  const fullSync = useCallback(async (delay = 0, conflictStrategy = 'LAST_WRITE_WINS') => {
    return await sync(delay, conflictStrategy, false);
  }, [sync]);

  const incrementalSync = useCallback(async (delay = 0, conflictStrategy = 'LAST_WRITE_WINS') => {
    return await sync(delay, conflictStrategy, true);
  }, [sync]);

  // Gestion de l'activation/désactivation (délègue à statusService)
  const enableAutoSync = useCallback(async () => {
    if (!statusService) {
      throw new Error('StatusService not available');
    }

    await statusService.setAutoSync(true);
  }, [statusService]);

  const disableAutoSync = useCallback(async () => {
    if (!statusService) {
      throw new Error('StatusService not available');
    }

    await statusService.setAutoSync(false);
  }, [statusService]);

  // Fonction pour marquer la fin d'affichage de sync (UI seulement)
  const setIsSyncOver = useCallback((isOver) => {
    if (isOver) {
      statusService.updateStatus({ isSyncOver: isOver });
    } else {
      statusService.resetSyncOver();
    }
  }, []);

  const isSyncNeeded = localCounts.hasChanges || (remoteCounts.hasChanges && remoteCounts.available);

  const value = {
    status,
    statusService,
    // États principaux depuis statusService
    autoSync: status.autoSync,
    isSyncing: status.isSyncing,
    isSyncOver: status.isSyncOver,
    lastSyncDate: status.lastSync,
    syncResults: status.results,
    syncErrors: status.errors,
    syncProgress: status.syncProgress,

    // Conflits depuis statusService
    conflicts: status.conflicts,
    hasDirtyConflicts: status.hasDirtyConflicts,

    // États dérivés
    canSync,
    isSyncNeeded,

    // Actions de synchronisation
    sync,
    fullSync,
    incrementalSync,
    enableAutoSync,
    disableAutoSync,
    setIsSyncOver
  };

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
};

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};