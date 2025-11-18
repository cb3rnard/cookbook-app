import { SettingsService } from "../SettingsService.js";
import { ApiUserSession } from "./ApiUserSession.js";

export class ApiConnectionStatus {
    constructor(userSession = null) {
        this.online = navigator.onLine;
        this.available = false;
        this.error = false;
        this.autoSyncActive = false;
        this.isAuthenticated = false;
        this.isDisconnected = false;
        this.status = '';
        this.userSession = userSession || new ApiUserSession();
    }

    get canSync() {
        return this.online && this.available && this.isAuthenticated && this.autoSyncActive
    }

    get apiUrl() {
        return this.userSession.apiUrl;
    }

    get user() {
        return this.userSession.user;
    }

    get hasActiveSession() {
        return this.userSession.isActive;
    }

    async initialize() {
        await this.setAutoSync();
    }

    update(statusObj) {
        this.online = statusObj.online !== undefined ? statusObj.online : this.online;
        this.available = statusObj.available !== undefined ? statusObj.available : this.available;
        this.error = statusObj.error !== undefined ? statusObj.error : this.error;
        this.isAuthenticated = statusObj.isAuthenticated !== undefined ? statusObj.isAuthenticated : this.isAuthenticated;
        this.isDisconnected = statusObj.isDisconnected !== undefined ? statusObj.isDisconnected : this.isDisconnected;
        this.status = statusObj.status || this.status;
        this.user = statusObj.user || this.user;
    }

    setStatus(newStatus) {
        this.status = newStatus;
    }

    setOnline(isOnline) {
        this.online = isOnline;
        if(!isOnline) {
            this.setAvailable(false);
            this.setAuthenticated(false);
        }
        this.setStatus(isOnline ? 'online' : 'offline');
    }

    setAvailable(isAvailable) {
        this.available = isAvailable;
        if(!isAvailable) {
            this.setAuthenticated(false);
        }
        this.setStatus(isAvailable ? 'available' : 'unavailable');
    }

    setAuthenticated(isAuthenticated) {
        this.isAuthenticated = isAuthenticated;
        this.setStatus(isAuthenticated ? 'authenticated' : 'unauthenticated');
    }

    setDisconnected(isDisconnected) {
        this.isDisconnected = isDisconnected;
        if(isDisconnected) {
            this.setAuthenticated(false);
            this.setStatus('disconnected');
        }
    }

    setError(error) {
        this.error = error;
        if (error) {
            this.setStatus('error');
        }
    }

    async setAutoSync(active) {
        if (active !== undefined) {
            this.autoSyncActive = active;
            return;
        }
        const autoSync = await SettingsService.getSetting('autoSync');
        this.autoSyncActive = autoSync || false;
    }
}