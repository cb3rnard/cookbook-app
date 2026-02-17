import { EndpointSyncable } from '@src/config/config';
import { EntitySyncable, IngredientApi, RecipeApi, TypeApi } from './entities';

// Shared operation result type
export interface SyncOperationResult {
  success: number;
  failed: number;
  errors: string[];
}

const defaultOperationResult: SyncOperationResult = {
  success: 0,
  failed: 0,
  errors: [],
};

export interface EndpointSyncState {
  toImport: number;
  toExport: number;
  conflicts: SyncConflict[];
  import: SyncOperationResult;
  export: SyncOperationResult;
  criticalError: string;
}

export const defaultEndpointSyncState: EndpointSyncState = {
  toImport: 0,
  toExport: 0,
  conflicts: [],
  import: { ...defaultOperationResult },
  export: { ...defaultOperationResult },
  criticalError: '',
};

export interface SyncOperationTotals {
  toSync: number;
  success: number;
  failed: number;
  allFailed: boolean;
  conflicts: number;
  imported: number;
  exported: number;
  errors: number;
  criticalErrors: number;
}

export interface SyncStep {
  entity: string;
  action: string;
}

export interface SyncError {
  message: string;
  step: SyncStep;
}

export interface SyncOperationState {
  name: string;
  step: SyncStep;
  endpoints: Map<EndpointSyncable, EndpointSyncState>;
  totals: SyncOperationTotals;
  completed: string;
  success: boolean;
  errors: SyncError[];
}

export const defaultSyncStep: SyncStep = {
  entity: '',
  action: '',
};

export const defaultSyncOperationTotals: SyncOperationTotals = {
  toSync: 0,
  success: 0,
  failed: 0,
  allFailed: false,
  conflicts: 0,
  imported: 0,
  exported: 0,
  errors: 0,
  criticalErrors: 0,
};

export const defaultSyncOperationState: SyncOperationState = {
  name: '',
  step: { ...defaultSyncStep },
  endpoints: new Map(),
  totals: { ...defaultSyncOperationTotals },
  completed: '',
  success: true,
  errors: [],
};

export interface SyncResults {
  success: number;
  failed: number;
  errors: string[];
}

export interface Conflict {
  uuid: string;
  local: string;
  remote: string;
  entityType: EndpointSyncable;
  conflictType: 'version' | 'name';
}

export interface SyncConflict {
  type: 'version' | 'name';
  endpoint: string;
  winner: 'local' | 'remote' | 'none';
  reason: string;
  localUuid: string;
  remoteUuid: string;
}

export interface SyncConflictResolution {
  toLocal: EntitySyncableDataFromApi[];
  toRemote: EntitySyncable[];
  conflicts: SyncConflict[];
}

export const defaultSyncConflictResolution: SyncConflictResolution = {
  toLocal: [],
  toRemote: [],
  conflicts: [],
};

// Combined type for entities data plus dateReceived
export type RecipeFromApi = Partial<RecipeApi> & {
  uuid: string;
  dateReceived: string;
};

export type IngredientFromApi = Partial<IngredientApi> & {
  uuid: string;
  dateReceived: string;
};

export type TypeFromApi = Partial<TypeApi> & {
  uuid: string;
  dateReceived: string;
};

export type EntitySyncableDataFromApi =
  | RecipeFromApi
  | IngredientFromApi
  | TypeFromApi;

export interface SyncPushResult {
  uuid: string;
  success: boolean;
  error?: string;
  dateReceived?: string;
  imageChanged?: boolean;
}

export interface SyncPushBulkResult {
  success: boolean;
  total: number;
  failed: number;
  allFailed: boolean;
  results: SyncPushResult[];
}
