import { EventBus } from "../utils/EventBus.js";
import { BaseStore } from "./BaseStore.js";

const initialState = {
  syncing: false,
  operation: {
    name: "",
    step: {
      entity: "",
      action: "",
    },
    summary: {
      results: null,
      errors: [],
      conflicts: new Map(),
    },
    completed: false,
    success: true,
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
   * Termine une opération de sync
   * @param {boolean} success Indique si la sync a réussi
   * @param {object|null} results Résultats de la sync
   * @param {Array} conflicts Liste des conflits rencontrés
   */
  finishOperation(success = true, results = null, conflicts = []) {
    this.setState({
      syncing: false,
      operation: {
        ...this._state.operation,
        step: {
          entity: "",
          action: "",
        },
        summary: {
          results: results,
          errors: this._state.operation.summary.errors,
          conflicts: conflicts,
        },
        completed: new Date().toISOString(),
        success: success,
      },
    });
    this.eventBus.emit("sync:completed");
  }

  clearOperation() {
    this.setState(initialState);
  }

  addOperationError(error) {
    console.error(error);
    this._state.operation.summary.errors.push({
      message: error,
      step: { ...this._state.operation.step },
    });
  }

  addOperationConflict(
    type = "",
    endpoint = "",
    resolution = "",
    keepedUuid = "",
  ) {
    if (!type || !endpoint || !resolution) {
      return;
    }
    const conflicts = this.conflicts;
    if (!conflicts.has(type)) {
      conflicts.set(type, new Map());
    }
    if (!conflicts.get(type).has(endpoint)) {
      conflicts.get(type).set(endpoint, []);
    }

    const conflict = {
      resolution: resolution,
      keepedUuid: keepedUuid,
    };

    conflicts.get(type).get(endpoint).push(conflict);
    this.setState({
      operation: {
        ...this._state.operation,
        summary: {
          ...this._state.operation.summary,
          conflicts: conflicts,
        },
      },
    });
  }
}
