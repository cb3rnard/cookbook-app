import { BaseStore } from "./BaseStore.js";
import { SessionStore } from "./SessionStore.js";

const initialState = {
  online: navigator.onLine,
  available: false,
  error: false,
  authenticated: false,
  disconnected: false,
  status: "",
  canSync: false,
  session: new SessionStore(),
  connecting: false,
};

export class ConnectionStore extends BaseStore {
  constructor() {
    super({ ...initialState });
  }

  get online() {
    return this._state.online;
  }

  get available() {
    return this._state.available;
  }

  get authenticated() {
    return this._state.authenticated;
  }

  get expired() {
    return this._state.expired;
  }

  get disconnected() {
    return this._state.disconnected;
  }

  get error() {
    return this._state.error;
  }

  get status() {
    return this._state.status;
  }

  get canSync() {
    return this._state.authenticated && this._state.session.autoSync;
  }

  get hasActiveSession() {
    return this._state.session.active;
  }

  get connecting() {
    return this._state.connecting;
  }

  setState(newState) {
    super.setState(newState);
    super.setState({ canSync: this.canSync });
  }

  update(statusObj) {
    this.setState(statusObj);
  }

  setSession(session) {
    this.session = session;
  }

  setStatus(newStatus) {
    this.setState({ status: newStatus });
  }

  setOnline(online) {
    this.setState({
      online,
      available: online ? this._state.available : false,
      authenticated: online ? this._state.authenticated : false,
      status: online ? "online" : "offline",
    });
  }

  setAvailable(available) {
    this.setState({
      available,
      authenticated: available ? this._state.authenticated : false,
      status: available ? "available" : "unavailable",
    });
  }

  setAuthenticated(authenticated) {
    this.setState({
      authenticated,
      available: authenticated ? true : this._state.available,
      disconnected: authenticated ? false : this._state.disconnected,
      status: authenticated ? "authenticated" : "unauthenticated",
    });
  }

  setExpired(expired) {
    this.setState({
      expired,
      authenticated: expired ? false : this._state.authenticated,
      status: expired ? "expired" : this._state.status,
    });
  }

  setDisconnected(disconnected) {
    this.setState({
      disconnected,
      authenticated: disconnected ? false : this._state.authenticated,
      status: disconnected ? "disconnected" : this._state.status,
    });
  }

  setError(error) {
    this.setState({
      error,
      status: error ? "error" : this._state.status,
    });
  }

  setConnecting(connecting) {
    this.setState({ connecting });
  }

  resetConnection() {
    this.setState({ ...initialState });
  }
}
