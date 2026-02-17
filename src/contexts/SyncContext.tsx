import { ConflictStrategy, CONSTANTS_SYNC } from '@src/config/config';
import { SyncState } from '@src/types/states';
import { createContext, useCallback, useContext, useMemo } from 'react';
import { useObservableState } from '../hooks/useObservableState';
import { SyncService } from '../services/sync/SyncService';
import { useApi } from './ApiContext';
import { useData } from './DataContext';

export interface SyncContext {
  syncState: SyncState;
  syncing: boolean;
  isSyncNeeded: boolean;
  sync: (
    delay?: number,
    conflictStrategy?: ConflictStrategy,
    incremental?: boolean,
  ) => Promise<void>;
  fullSync: (
    delay?: number,
    conflictStrategy?: ConflictStrategy,
  ) => Promise<void>;
  incrementalSync: (
    delay?: number,
    conflictStrategy?: ConflictStrategy,
  ) => Promise<void>;
  clearOperation: () => void;
}

const SyncContext = createContext<SyncContext | undefined>(undefined);

export const SyncProvider = ({ children }: { children: React.ReactNode }) => {
  const { connection } = useApi();
  const { authenticated } = connection;
  const { localCounts, remoteCounts } = useData();

  const syncService = useMemo(() => new SyncService(), []);

  const syncState = useObservableState<SyncState>(syncService.syncStore);
  const { syncing } = syncState;

  // Actions de synchronisation (délèguent à SyncService)
  const sync = useCallback(
    async (
      delay = 0,
      conflictStrategy: ConflictStrategy = 'LAST_WRITE_WINS',
      incremental = false,
    ) => {
      if (!authenticated) {
        throw new Error('Cannot sync: not authenticated.');
      }

      if (syncing) {
        throw new Error('Sync already in progress.');
      }

      try {
        await syncService.sync(delay, conflictStrategy, incremental);
      } catch (error) {
        throw error;
      }
    },
    [authenticated, syncing, syncService],
  );

  const fullSync = useCallback(
    async (
      delay = 0,
      conflictStrategy: ConflictStrategy = CONSTANTS_SYNC
        .CONFLICT_STRATEGIES_VALUES.LAST_WRITE_WINS,
    ) => {
      return sync(delay, conflictStrategy);
    },
    [sync],
  );

  const incrementalSync = useCallback(
    async (
      delay = 0,
      conflictStrategy: ConflictStrategy = CONSTANTS_SYNC
        .CONFLICT_STRATEGIES_VALUES.LAST_WRITE_WINS,
    ) => {
      return sync(delay, conflictStrategy, true);
    },
    [sync],
  );

  const clearOperation = useCallback(() => {
    syncService.syncStore.clearOperation();
  }, [syncService.syncStore]);

  const isSyncNeeded =
    localCounts.hasChanges ||
    (remoteCounts.hasChanges && remoteCounts.available);

  const value = {
    syncState,
    syncing: syncState.syncing,

    // États dérivés
    isSyncNeeded,

    // Actions de synchronisation
    sync,
    fullSync,
    incrementalSync,
    clearOperation,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
