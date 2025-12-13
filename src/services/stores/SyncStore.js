import { EventBus } from "../utils/EventBus.js";
import { BaseStore } from "./BaseStore.js";

const initialEndpointState = {
  toImport: 0,
  toExport: 0,
  conflicts: [],
  import: {
    success: 0,
    failed: 0,
    errors: [], // Entity-level errors (non-blocking)
  },
  export: {
    success: 0,
    failed: 0,
    errors: [], // Entity-level errors (non-blocking)
  },
  criticalError: null, // Endpoint-level critical error (stops endpoint sync)
};

const initialState = {
  syncing: false,
  operation: {
    name: "",
    step: {
      entity: "",
      action: "",
    },
    endpoints: new Map(),
    totals: {
      toSync: 0,
      failed: 0,
      conflicts: 0,
      imported: 0,
      exported: 0,
      errors: 0,
      criticalErrors: 0,
    },
    completed: false,
    success: true,
    errors: [],
  },
};

export class SyncStore extends BaseStore {
  constructor() {
    super(initialState);
    this.eventBus = EventBus.getInstance();
  }

  /**
   * Vérifie si une sync est en cours
   */
  get syncing() {
    return this._state.syncing;
  }

  get conflicts() {
    return this._state.operation.conflicts;
  }

  /**
   * Démarre une opération de sync
   */
  startOperation(operation, entity = "", action = "") {
    this.setState({
      syncing: true,
      operation: {
        ...this._state.operation,
        name: operation,
        step: {
          entity,
          action,
        },
      },
    });
    this.eventBus.emit("sync:started");
  }

  /**
   * Updates sync status
   * @param {string} entity Current entity being synced
   * @param {string} action Current action being performed
   */
  updateOperation(entity = "", action = "") {
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
   * @param {string} endpoint Endpoint name
   * @param {number} toImport Number of entities to import
   * @param {number} toExport Number of entities to export
   */
  setEndpointCounts(endpoint, toImport, toExport) {
    const endpoints = this._state.operation.endpoints;
    const endpointState = endpoints.get(endpoint) || {
      ...initialEndpointState,
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
   * @param {string} endpoint Endpoint name
   * @param {Array} conflicts Array of conflict objects
   */
  setEndpointConflicts(endpoint, conflicts) {
    const endpoints = this._state.operation.endpoints;
    const endpointState = endpoints.get(endpoint) || {
      ...initialEndpointState,
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
   * @param {string} endpoint Endpoint name
   * @param {Object} results Import results {success, failed, errors}
   */
  setEndpointImportResults(endpoint, results) {
    const endpoints = this._state.operation.endpoints;
    const endpointState = endpoints.get(endpoint) || {
      ...initialEndpointState,
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
   * @param {string} endpoint Endpoint name
   * @param {Object} results Export results {success, failed, errors}
   */
  setEndpointExportResults(endpoint, results) {
    const endpoints = this._state.operation.endpoints;
    const endpointState = endpoints.get(endpoint) || {
      ...initialEndpointState,
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
  setEndpointCriticalError(endpoint, errorMessage) {
    const endpoints = this._state.operation.endpoints;
    const endpointState = endpoints.get(endpoint) || {
      ...initialEndpointState,
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
   */
  finishOperation() {
    const totals = this._calculateTotals(this._state.operation.endpoints);

    // Check if all entities were processed
    const processed = totals.success + totals.failed;
    const isComplete = totals.toSync === 0 || processed === totals.toSync;

    const syncState = {
      syncing: false,
      operation: {
        ...this._state.operation,
        step: {
          entity: "",
          action: "",
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
    this.eventBus.emit("sync:completed", this._state.operation);
    return syncState.operation.success;
  }

  /**
   * Calculates total results from all endpoints
   * @param {Map} endpointsMap Map of endpoint states
   * @returns {Object} Totals object
   */
  _calculateTotals(endpointsMap) {
    const totals = {
      allFailed: false,
      toSync: 0,
      failed: 0,
      conflicts: 0,
      imported: 0,
      exported: 0,
      errors: 0,
      criticalErrors: 0,
    };

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
    this.setState(initialState);
  }

  /**
   * Adds an error to the current sync operation
   * @param {string} errorMessage Error message
   */
  addOperationError(errorMessage) {
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
