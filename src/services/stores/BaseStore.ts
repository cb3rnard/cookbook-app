export class BaseStore<
  TState extends Record<string, any> = Record<string, any>,
> {
  static _instances = new Map();
  _state!: TState;
  subscribers!: Set<() => void>;

  constructor(initialState: TState) {
    const className = this.constructor.name;
    if (BaseStore._instances.has(className)) {
      return BaseStore._instances.get(className);
    }

    this._state = initialState;
    this.subscribers = new Set();

    BaseStore._instances.set(className, this);
    return this;
  }

  get state(): TState {
    return this._state;
  }

  getState(): TState {
    return this._state;
  }

  setState(newState: Partial<TState>) {
    this._state = { ...this._state, ...newState };
    this.notify();
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify() {
    this.subscribers.forEach((cb) => cb());
  }
}
