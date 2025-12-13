import { BaseStore } from "./BaseStore";

const initialState = {
  apiUrl: "",
  user: {
    id: "",
    email: "",
  },
  savedAt: null,
  autoSync: false,
  lastSyncDate: null,
  active: false,
};

export class SessionStore extends BaseStore {
  constructor() {
    super(initialState);
    this._initialize();
  }

  _initialize() {
    const sessionData = localStorage.getItem("apiSession");
    if (sessionData) {
      const session = JSON.parse(sessionData);
      this.setState({
        apiUrl: this.normalizeApiUrl(session.apiUrl) || "",
        user: session.user || { id: "", email: "" },
        savedAt: session.savedAt ? new Date(session.savedAt) : null,
        autoSync: session.autoSync || false,
        lastSyncDate: session.lastSyncDate || null,
        active: true,
      });
    }
  }

  get apiUrl() {
    return this._state.apiUrl;
  }

  get active() {
    return this._state.active;
  }

  get autoSync() {
    return this._state.autoSync;
  }

  get lastSyncDate() {
    return this._state.lastSyncDate;
  }

  saveSession(user = {}, apiUrl = "") {
    if (!user.id || !apiUrl) {
      throw new Error("User and API URL are required to save the session.");
    }
    this._persistSession({
      apiUrl: this.normalizeApiUrl(apiUrl) || "",
      user: {
        id: user.id || "",
        email: user.email || "",
      },
      savedAt: new Date(),
      autoSync:
        this._state.autoSync !== undefined ? this._state.autoSync : false,
      lastSyncDate: this._state.lastSyncDate || null,
      active: true,
    });
  }

  /**
   * Active/désactive la synchronisation automatique
   */
  toggleAutoSync() {
    this._persistSession({
      autoSync: !this._state.autoSync,
    });
  }

  /**
   * Met à jour la date de dernière synchronisation
   */
  setLastSyncDate(date = null) {
    this._persistSession({
      ...this._state,
      lastSyncDate: date || new Date().toISOString(),
    });
  }

  /**
   * Persiste la session sans modifier les données
   * @private
   */
  _persistSession(newState) {
    this.setState({ ...newState });
    localStorage.setItem("apiSession", JSON.stringify(this._state));
  }

  clearSession() {
    this.setState(initialState);
    localStorage.removeItem("apiSession");
  }

  normalizeApiUrl(url = "") {
    return url.replace(/\/+$/, "");
  }
}
