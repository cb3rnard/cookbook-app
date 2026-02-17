import { Recipe } from '@src/models/entities/Recipe';
import { SessionStore } from '@src/services/stores/SessionStore';
import { defaultRecipeFilters, RecipeFilters } from '@src/types/repositories';
import { CountsModel, countsModel } from './data';
import { RemoteDirtyVersion } from './entities';
import { HydrateOptions } from './repositories';
import { defaultSyncOperationState, SyncOperationState } from './sync';

export interface RecipesState {
  recipes: Recipe[];
  currentFilters: RecipeFilters;
  currentHydrate: Partial<HydrateOptions>;
  loading: boolean;
}

export const defaultRecipesState: RecipesState = {
  recipes: [],
  currentFilters: { ...defaultRecipeFilters },
  currentHydrate: {},
  loading: false,
};

export interface SyncState {
  syncing: boolean;
  operation: SyncOperationState;
}

export const defaultSyncState: SyncState = {
  syncing: false,
  operation: { ...defaultSyncOperationState },
};

export interface UserInfo {
  id: string;
  email: string;
}

export interface SessionState {
  apiUrl: string;
  user: UserInfo;
  savedAt: Date | null;
  autoSync: boolean;
  lastSyncDate: string;
  active: boolean;
}

export const defaultSessionState: SessionState = {
  apiUrl: '',
  user: {
    id: '',
    email: '',
  },
  savedAt: null,
  autoSync: false,
  lastSyncDate: '',
  active: false,
};

export interface DataState {
  localCounts: CountsModel;
  remoteCounts: CountsModel;
  remoteDirtyVersions: Map<string, RemoteDirtyVersion>;
}

export const defaultDataState: DataState = {
  localCounts: { ...countsModel },
  remoteCounts: { ...countsModel },
  remoteDirtyVersions: new Map(),
};

export interface ConnectionState {
  online: boolean;
  available: boolean;
  error: boolean;
  authenticated: boolean;
  disconnected: boolean;
  expired: boolean;
  status: string;
  canSync: boolean;
  session: SessionStore;
  connecting: boolean;
}

export const defaultConnectionState: ConnectionState = {
  online: navigator.onLine,
  available: false,
  error: false,
  authenticated: false,
  disconnected: false,
  expired: false,
  status: '',
  canSync: false,
  session: new SessionStore(),
  connecting: false,
};
