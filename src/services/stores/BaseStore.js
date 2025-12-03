export class BaseStore {
  static _instances = new Map();

  constructor(initialState = {}) {
    const className = this.constructor.name;
    if (BaseStore._instances.has(className)) {
      return BaseStore._instances.get(className);
    }

    this._state = initialState;
    this.subscribers = new Set();

    BaseStore._instances.set(className, this);
  }

  get state() {
    return this._state;
  }

  getState() {
    return this._state;
  }

  setState(newState) {
    this._state = { ...this._state, ...newState };
    this.notify();
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify() {
    this.subscribers.forEach((cb) => cb());
  }
}
