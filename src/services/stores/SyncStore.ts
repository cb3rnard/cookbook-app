import { EndpointSyncable } from '@src/config/config.ts';
import { defaultSyncState, SyncState } from '@src/types/states.ts';
import {
  defaultEndpointSyncState,
  defaultSyncOperationTotals,
  SyncConflict,
  SyncResults,
} from '@src/types/sync.ts';
import { EventBus } from '../utils/EventBus.ts';
import { BaseStore } from './BaseStore.js';

export class SyncStore extends BaseStore<SyncState> {
  eventBus: EventBus;

  constructor() {
    super({ ...defaultSyncState });
    this.eventBus = EventBus.getInstance();
  }

  /**
   * Vérifie si une sync est en cours
   */
  get syncing() {
    return this._state.syncing;
  }

  get conflicts() {
    return Object.values(this._state.operation.endpoints).flatMap(
      (endpoint) => endpoint.conflicts || [],
    );
  }

  /**
   * Démarre une opération de sync
   */
  startOperation(operationName: string, entity = '', action = '') {
    this.setState({
      syncing: true,
      operation: {
        ...this._state.operation,
        name: operationName,
        step: {
          entity,
          action,
        },
      },
    });
    this.eventBus.emit('sync:started');
  }

  /**
   * Updates sync status
   * @param {string} entity Current entity being synced
   * @param {string} action Current action being performed
   */
  updateOperation(entity = '', action = '') {
    this.setState({
      operation: {
        ...this._state.operation,
        step: {
          entity,
          action,
        },
      },
    });
  }

  /**
   * Sets the counts of entities to sync for an endpoint
   * @param {EndpointSyncable} endpoint Endpoint name
   * @param {number} toImport Number of entities to import
   * @param {number} toExport Number of entities to export
   */
  setEndpointCounts(
    endpoint: EndpointSyncable,
    toImport: number,
    toExport: number,
  ) {
    const endpoints = this._state.operation.endpoints;
    const endpointState = endpoints.get(endpoint) || {
      ...defaultEndpointSyncState,
    };

    endpointState.toImport = toImport;
    endpointState.toExport = toExport;

    endpoints.set(endpoint, endpointState);

    this.setState({
      operation: {
        ...this._state.operation,
        endpoints,
      },
    });
  }

  /**
   * Adds conflicts detected for an endpoint
   * @param {EndpointSyncable} endpoint Endpoint name
   * @param {Array} conflicts Array of conflict objects
   */
  setEndpointConflicts(endpoint: EndpointSyncable, conflicts: SyncConflict[]) {
    const endpoints = this._state.operation.endpoints;
    const endpointState = endpoints.get(endpoint) || {
      ...defaultEndpointSyncState,
    };

    endpointState.conflicts = conflicts;

    endpoints.set(endpoint, endpointState);

    this.setState({
      operation: {
        ...this._state.operation,
        endpoints,
      },
    });
  }

  /**
   * Updates import results for an endpoint
   */
  setEndpointImportResults(
    endpoint: EndpointSyncable,
    results: SyncResults,
  ): void {
    const endpoints = this._state.operation.endpoints;
    const endpointState = endpoints.get(endpoint) || {
      ...defaultEndpointSyncState,
    };

    endpointState.import = {
      success: results.success || 0,
      failed: results.failed || 0,
      errors: results.errors || [],
    };

    endpoints.set(endpoint, endpointState);

    this.setState({
      operation: {
        ...this._state.operation,
        endpoints,
      },
    });
  }

  /**
   * Updates export results for an endpoint
   */
  setEndpointExportResults(
    endpoint: EndpointSyncable,
    results: SyncResults,
  ): void {
    const endpoints = this._state.operation.endpoints;
    const endpointState = endpoints.get(endpoint) || {
      ...defaultEndpointSyncState,
    };

    endpointState.export = {
      success: results.success || 0,
      failed: results.failed || 0,
      errors: results.errors || [],
    };

    endpoints.set(endpoint, endpointState);

    this.setState({
      operation: {
        ...this._state.operation,
        endpoints,
      },
    });
  }

  /**
   * Sets a critical error for an endpoint
   * Critical errors stop sync for that endpoint
   * @param {string} endpoint Endpoint name
   * @param {string} errorMessage Error message
   */
  setEndpointCriticalError(endpoint: EndpointSyncable, errorMessage: string) {
    const endpoints = this._state.operation.endpoints;
    const endpointState = endpoints.get(endpoint) || {
      ...defaultEndpointSyncState,
    };

    endpointState.criticalError = errorMessage;

    endpoints.set(endpoint, endpointState);

    this.setState({
      operation: {
        ...this._state.operation,
        endpoints,
      },
    });
  }

  /**
   * Finishes the sync operation
   * @returns {boolean} Success status
   */
  finishOperation(): boolean {
    const totals = this._calculateTotals(this._state.operation.endpoints);

    // Check if all entities were processed
    const processed = totals.success + totals.failed;
    const isComplete = totals.toSync === 0 || processed === totals.toSync;

    const syncState = {
      syncing: false,
      operation: {
        ...this._state.operation,
        step: {
          entity: '',
          action: '',
        },
        totals,
        completed: new Date().toISOString(),
        success:
          totals.failed === 0 &&
          this._state.operation.errors.length === 0 &&
          isComplete,
      },
    };

    this.setState(syncState);
    this.eventBus.emit('sync:completed', this._state.operation);
    return syncState.operation.success;
  }

  /**
   * Calculates total results from all endpoints
   * @param {Map} endpointsMap Map of endpoint states
   * @returns {Object} Totals object
   */
  _calculateTotals(
    endpointsMap: Map<EndpointSyncable, typeof defaultEndpointSyncState>,
  ) {
    const totals = { ...defaultSyncOperationTotals };

    endpointsMap.forEach((state) => {
      totals.toSync += state.toImport + state.toExport;
      totals.failed += state.import.failed + state.export.failed;
      totals.conflicts += state.conflicts.length;
      totals.imported += state.import.success;
      totals.exported += state.export.success;
      totals.errors += state.import.errors.length + state.export.errors.length;
      if (state.criticalError) {
        totals.criticalErrors++;
      }
    });

    totals.success = totals.imported + totals.exported;
    totals.allFailed = totals.failed > 0 && totals.success === 0;
    return totals;
  }

  clearOperation() {
    this.setState({ ...defaultSyncState });
  }

  /**
   * Adds an error to the current sync operation
   * @param {string} errorMessage Error message
   */
  addOperationError(errorMessage: string) {
    const errors = [...this._state.operation.errors];
    errors.push({
      message: errorMessage,
      step: { ...this._state.operation.step },
    });

    this.setState({
      operation: {
        ...this._state.operation,
        errors,
      },
    });
  }
}
