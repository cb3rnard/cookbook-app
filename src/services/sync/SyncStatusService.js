/**
 * Service de gestion des statuts de synchronisation
 * Responsabilité : Suivi et gestion des états de sync
 */
import { SettingsService } from '../SettingsService';
import { EventBus } from '../utils/EventBus.js';

export class SyncStatusService {
    constructor() {
        this.status = {
            autoSync: false,
            isSyncing: false,
            lastSync: null,
            syncProgress: {
                current: 0,
                total: 0,
                operation: null
            },
            errors: [],
            conflicts: [],
            results: null, // Résultats de la dernière sync
            isSyncOver: false // Indique si la sync est terminée (UI)
        };
        
        // 🚀 Utiliser l'EventBus global
        this.eventBus = EventBus.getInstance();
        
        // 🚀 Garder l'ancien système pour rétrocompatibilité
        this.listeners = new Set();
    }

    /**
     * Initialise le service avec les valeurs persistées
     * À appeler une seule fois au démarrage de l'application
     */
    async initialize() {
        // Récupérer les valeurs persistées
        const autoSync = await SettingsService.getSetting('autoSync');
        const lastSync = await SettingsService.getSetting('lastSyncDate');

        // Mettre à jour le statut avec les valeurs persistées
        this.updateStatus({
            autoSync: !!autoSync,
            lastSync: lastSync || null
        });

        return true;
    }

    /**
     * Ajoute un listener pour les changements de statut
     * 🚀 Rétrocompatibilité : utilise encore l'ancien système pour ne rien casser
     */
    addStatusListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Obtient le statut actuel (méthode statique utilisée par SyncContext)
     */
    getStatus() {
        return this.status;
    }

    /**
     * Obtient le résumé du statut (méthode utilisée par SyncContext)
     * Note: Les counts sont maintenant gérés par DataContext
     */
    getStatusSummary() {
        return {
            canSync: !this.status.isSyncing,
            totalErrors: this.status.errors.length,
            totalConflicts: this.status.conflicts.length
        };
    }

    getProgress() {
        return this.status.syncProgress;
    }

    /**
     * Démarre une opération de sync
     */
    startOperation(operation) {
        this.updateStatus({
            isSyncing: true,
            syncProgress: {
                current: 0,
                total: 0,
                operation: {
                    entity: '',
                    step: '',
                }
            }
        });
    }

    /**
     * Met à jour le progrès de sync
     */
    updateProgress(current, total, operation = null) {
        const progress = { ...this.status.syncProgress };
        if (current !== undefined) progress.current = current;
        if (total !== undefined) progress.total = total;
        if (operation !== null) progress.operation = operation;

        this.updateStatus({ syncProgress: progress });
    }

    /**
     * Termine une opération de sync
     * @param {boolean} success Indique si la sync a réussi
     * @param {object|null} results Résultats de la sync
     */
    async finishOperation(success = true, results = null) {
        const now = new Date().toISOString();

        if (success) {
            try {
                // Persister la date de dernière sync
                await SettingsService.setSetting('lastSyncDate', now);
            } catch (error) {
                // Continuer même si la sauvegarde échoue
            }
        }

        this.updateStatus({
            isSyncing: false,
            lastSync: success ? now : this.status.lastSync,
            syncProgress: {
                current: this.status.syncProgress.total,
                total: this.status.syncProgress.total,
                operation: success ? 'Terminé' : 'Échoué'
            },
            results: results, // Stocker les résultats
            isSyncOver: true // Marquer la sync comme terminée
        });
    }

    /**
     * Stocke les résultats de sync
     */
    setResults(results) {
        this.updateStatus({
            results,
            isSyncOver: true
        });
    }

    /**
     * Remet à zéro l'indicateur de fin de sync
     */
    resetSyncOver() {
        this.updateStatus({
            isSyncOver: false,
            results: null
        });
    }

    /**
     * Ajoute un listener pour les changements de statut (méthode d'instance)
     */
    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Notifie tous les listeners
     */
    notifyListeners() {
        this.listeners.forEach(callback => {
            try {
                callback(this.status);
            } catch (error) {
                console.error('Erreur dans le listener de SyncStatusService:', error);
            }
        });
    }

    /**
     * Met à jour le statut et notifie les listeners
     * 🚀 Utilise EventBus global + ancien système pour rétrocompatibilité
     */
    updateStatus(updates) {
        // Mettre à jour le status
        this.status = { ...this.status, ...updates };
        
        // 🚀 Émettre via EventBus global
        this.eventBus.emit('sync:statusChange', {
            service: 'syncStatusService',
            status: this.status,
            syncStatusService: this
        });
        
        // 🚀 Rétrocompatibilité
        this.notifyListeners();
    }

    addError(error) {
        const errors = [...this.status.errors, {
            message: error.message || error,
            timestamp: new Date().toISOString(),
            stack: error.stack
        }];
        this.updateStatus({ errors });
    }

    addConflict(conflict) {
        const conflicts = [...this.status.conflicts, {
            ...conflict,
            timestamp: new Date().toISOString()
        }];
        this.updateStatus({ conflicts });
    }

    /**
     * Active/désactive la synchronisation et persiste la valeur
     */
    async setAutoSync(active) {
        // Persister dans les settings
        await SettingsService.setSetting('autoSync', active);

        // Mettre à jour l'état local
        this.updateStatus({ autoSync: active });
    }

    /**
     * Remet à zéro les erreurs (méthode d'instance)
     */
    clearErrors() {
        this.updateStatus({ errors: [] });
    }

    /**
     * Remet à zéro les conflits
     */
    clearConflicts() {
        this.updateStatus({ conflicts: [] });
    }

    /**
     * Vérifie si une sync est en cours
     */
    isRunning() {
        return this.status.isSyncing;
    }

    /**
     * Remet à zéro complètement le statut
     */
    reset() {
        this.status = {
            autoSync: false,
            isSyncing: false,
            lastSync: null,
            syncProgress: {
                current: 0,
                total: 0,
                operation: null
            },
            errors: [],
            conflicts: [],
            results: null,
            isSyncOver: false
        };
        this.notifyListeners();
    }
}