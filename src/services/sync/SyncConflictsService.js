import { DebugService } from '../DebugService.js';

/**
 * Service dédié à la gestion des conflits de synchronisation
 * Responsabilité: Détection et résolution des conflits entre entités locales et distantes
 */
export class SyncConflictsService {

    /**
     * Détecte les conflits entre UUIDs locaux et distants
     * @param {Object} localDirtyUuids - UUIDs dirty locaux par type
     * @param {Object} remoteDirtyUuids - UUIDs dirty distants par type
     * @returns {Object} Conflits détectés par type d'entité
     */
    static detectConflicts(localDirtyUuids, remoteDirtyUuids) {
        const conflicts = {
            recipes: [],
            ingredients: [],
            types: [],
            hasConflicts: false
        };

        ['recipes', 'ingredients', 'types'].forEach(entityType => {
            const localEntities = localDirtyUuids[entityType] || [];
            const remoteEntities = remoteDirtyUuids[entityType] || [];

            // Trouver les UUIDs en conflit (présents dans les deux listes)
            const conflictUuids = localEntities.filter(localUuid =>
                remoteEntities.includes(localUuid)
            );

            conflicts[entityType] = conflictUuids.map(uuid => ({
                uuid,
                local: uuid,
                remote: uuid,
                entityType,
                conflictType: 'version'
            }));
        });

        conflicts.hasConflicts = Object.values(conflicts)
            .some(entityConflicts => Array.isArray(entityConflicts) && entityConflicts.length > 0);

        return conflicts;
    }

    /**
     * Détecte les conflits de noms (pour types et ingrédients)
     * @param {Array} localEntities - Entités locales
     * @param {Array} remoteEntities - Entités distantes
     * @param {string} entityType - Type d'entité (types, ingredients)
     * @returns {Array} Conflits de noms détectés
     */
    static detectNameConflicts(localEntities, remoteEntities, entityType) {
        if (!['types', 'ingredients'].includes(entityType)) {
            return [];
        }

        const nameConflicts = [];

        localEntities.forEach(localEntity => {
            const remoteConflict = remoteEntities.find(remoteEntity =>
                remoteEntity.name?.toLowerCase() === localEntity.name?.toLowerCase() &&
                remoteEntity.uuid !== localEntity.uuid
            );

            if (remoteConflict) {
                nameConflicts.push({
                    local: localEntity,
                    remote: remoteConflict,
                    entityType,
                    conflictType: 'name',
                    conflictField: 'name',
                    conflictValue: localEntity.name
                });
            }
        });

        return nameConflicts;
    }

    /**
     * Résout les conflits de version selon une stratégie
     * @param {Array} localEntities - Entités locales
     * @param {Array} remoteEntities - Entités distantes
     * @param {string} strategy - Stratégie de résolution ('LAST_WRITE_WINS', 'LOCAL_WINS', 'REMOTE_WINS')
     * @returns {Object} Résolution des conflits
     */
    static resolveVersionConflicts(localEntities, remoteEntities, strategy = 'LAST_WRITE_WINS') {

        const resolution = {
            toLocal: [], // Entités à appliquer localement
            toRemote: [], // Entités à envoyer au serveur
            conflicts: [] // Conflits non résolus
        };

        DebugService.warn([`Starting conflict resolution with strategy: ${strategy}`], 'sync');
        // Créer des maps pour un accès rapide
        const localMap = new Map(localEntities.map(e => [e.uuid, e]));
        const remoteMap = new Map(remoteEntities.map(e => [e.uuid, e]));

        // Traiter les entités locales
        localEntities.forEach(localEntity => {
            const remoteEntity = remoteMap.get(localEntity.uuid);

            if (!remoteEntity) {
                // Entité locale uniquement → à envoyer au serveur
                resolution.toRemote.push(localEntity);
            } else {
                // Conflit de version → appliquer la stratégie
                DebugService.warn([`Applying ${strategy} strategy for UUID: ${localEntity.uuid}`], 'sync');
                const resolved = this._applyConflictStrategy(localEntity, remoteEntity, strategy);

                if (resolved.winner === 'local') {
                    resolution.toRemote.push(localEntity);
                } else if (resolved.winner === 'remote') {
                    resolution.toLocal.push(remoteEntity);
                } else {
                    resolution.conflicts.push({
                        local: localEntity,
                        remote: remoteEntity,
                        reason: resolved.reason
                    });
                }
            }
        });

        // Traiter les entités distantes uniquement
        remoteEntities.forEach(remoteEntity => {
            if (!localMap.has(remoteEntity.uuid)) {
                // Entité distante uniquement → à appliquer localement
                resolution.toLocal.push(remoteEntity);
            }
        });

        return resolution;
    }

    /**
     * Applique une stratégie de résolution de conflit
     * @private
     */
    static _applyConflictStrategy(localEntity, remoteEntity, strategy) {
        switch (strategy) {
            case 'LOCAL_WINS':
                return { winner: 'local', reason: 'Local wins strategy' };

            case 'REMOTE_WINS':
                return { winner: 'remote', reason: 'Remote wins strategy' };

            case 'LAST_WRITE_WINS':
            default:
                const localDate = new Date(localEntity.dateModify || localEntity.dateAdd || 0);
                const remoteDate = new Date(remoteEntity.dateModify || remoteEntity.dateAdd || 0);
                DebugService.warn(`Comparing local date ${localDate} with remote date ${remoteDate} for entity UUID ${localEntity.uuid}`);

                if (localDate > remoteDate) {
                    return { winner: 'local', reason: 'Local entity is newer' };
                } else if (remoteDate > localDate) {
                    return { winner: 'remote', reason: 'Remote entity is newer' };
                } else {
                    // Dates identiques → utiliser la version
                    const localVersion = localEntity.version || 0;
                    const remoteVersion = remoteEntity.version || 0;

                    if (localVersion > remoteVersion) {
                        return { winner: 'local', reason: 'Local version is higher' };
                    } else if (remoteVersion > localVersion) {
                        return { winner: 'remote', reason: 'Remote version is higher' };
                    } else {
                        return { winner: 'none', reason: 'Identical dates and versions' };
                    }
                }
        }
    }

    /**
     * Résout les conflits de noms pour éviter les doublons
     * Remplace l'entité locale par la distante et met à jour les références
     * @param {Array} entitiesToImport - Entités à importer
     * @param {Object} repository - Repository de l'entité
     * @returns {Promise<Array>} Entités validées pour l'import
     */
    static async resolveNameConflicts(entitiesToImport, repository) {
        if (!entitiesToImport.length) return [];


        const validatedEntities = [];
        const importNames = entitiesToImport.map(e => e.name.toLowerCase());

        // Récupérer toutes les entités locales avec des noms conflictuels
        const existingEntities = await repository.getAllBy('name', importNames);

        for (const entityToImport of entitiesToImport) {
            const conflictingEntity = existingEntities.find(
                e => e.name.toLowerCase() === entityToImport.name.toLowerCase() &&
                    e.uuid !== entityToImport.uuid
            );

            if (!conflictingEntity) {
                validatedEntities.push(entityToImport);
                continue;
            }

            try {
                // Mettre à jour toutes les références vers l'entité locale conflictuelle
                const updatedReferences = await this.updateEntityReferences(
                    conflictingEntity.uuid,
                    entityToImport.uuid,
                    entityType
                );

                // Supprimer l'entité locale conflictuelle
                await repository.delete(conflictingEntity.uuid);

                validatedEntities.push(entityToImport);

            } catch (error) {
                // En cas d'erreur, on garde l'entité locale
            }
        }

        return validatedEntities;
    }

    /**
     * Met à jour toutes les références d'une entité dans les relations
     * @param {string} oldUuid - UUID de l'ancienne entité
     * @param {string} newUuid - UUID de la nouvelle entité
     * @param {string} endpoint - Type d'entité (ingredients, types)
     * @returns {Promise<number>} Nombre de références mises à jour
     */
    static async updateEntityReferences(oldUuid, newUuid, endpoint) {
        if (!['ingredients', 'types'].includes(endpoint)) {
            throw new Error(`Cannot update references for entity type: ${endpoint}. Only "ingredients" and "types" are supported.`);
        }

        // Import dynamique de la base de données pour éviter les dépendances circulaires
        const { default: database } = await import('../StorageService.js');
        let updatedCount = 0;

        try {

        } catch (error) {
            throw error;
        }
    }

    /**
     * Valide une stratégie de résolution
     * @param {string} strategy - Stratégie à valider
     * @returns {boolean} True si la stratégie est valide
     */
    static isValidStrategy(strategy) {
        return Object.values(this.STRATEGIES).includes(strategy);
    }

    /**
     * Obtient des statistiques sur les conflits
     * @param {Object} conflicts - Conflits détectés
     * @returns {Object} Statistiques des conflits
     */
    static getConflictStats(conflicts) {
        if (!conflicts) {
            return {
                totalConflicts: 0,
                byType: { recipes: 0, ingredients: 0, types: 0 },
                hasConflicts: false
            };
        }

        const stats = {
            totalConflicts: 0,
            byType: { recipes: 0, ingredients: 0, types: 0 },
            hasConflicts: conflicts.hasConflicts || false
        };

        ['recipes', 'ingredients', 'types'].forEach(entityType => {
            const typeConflicts = conflicts[entityType] || [];
            stats.byType[entityType] = typeConflicts.length;
            stats.totalConflicts += typeConflicts.length;
        });

        return stats;
    }

    /**
     * Stratégies de résolution disponibles
     */
    static get STRATEGIES() {
        return {
            LAST_WRITE_WINS: 'LAST_WRITE_WINS',
            LOCAL_WINS: 'LOCAL_WINS',
            REMOTE_WINS: 'REMOTE_WINS'
        };
    }

    /**
     * Types de conflits supportés
     */
    static get CONFLICT_TYPES() {
        return {
            VERSION: 'version',
            NAME: 'name',
            DELETED: 'deleted'
        };
    }
}