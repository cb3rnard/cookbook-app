import { DebugService } from "../DebugService.js";

export class SyncConflictsService {
  static syncStore = null;
  /**
   * Détecte les conflits entre UUIDs locaux et distants
   * @param {Object} localDirtyUuids - UUIDs dirty locaux par type
   * @param {Object} remoteDirtyUuids - UUIDs dirty distants par type
   * @returns {Object} Conflits détectés par type d'entité
   */
  static detectConflictsFromUuids(localDirtyUuids, remoteDirtyUuids) {
    const conflicts = {
      recipes: [],
      ingredients: [],
      types: [],
      hasConflicts: false,
    };

    ["recipes", "ingredients", "types"].forEach((entityType) => {
      const localEntities = localDirtyUuids[entityType] || [];
      const remoteEntities = remoteDirtyUuids[entityType] || [];

      // Trouver les UUIDs en conflit (présents dans les deux listes)
      const conflictUuids = localEntities.filter((localUuid) =>
        remoteEntities.includes(localUuid),
      );

      conflicts[entityType] = conflictUuids.map((uuid) => ({
        uuid,
        local: uuid,
        remote: uuid,
        entityType,
        conflictType: "version",
      }));
    });

    conflicts.hasConflicts = Object.values(conflicts).some(
      (entityConflicts) =>
        Array.isArray(entityConflicts) && entityConflicts.length > 0,
    );

    return conflicts;
  }

  static detectConflicts(endpoint, toRemote, toLocal, strategy, syncStore) {
    this.syncStore = syncStore;
    let resolution = {
      toRemote: toRemote, // Entités à envoyer au serveur
      toLocal: toLocal, // Entités à appliquer localement
    };
    const versionResolution = this.detectVersionConflicts(
      endpoint,
      toRemote,
      toLocal,
    );
    resolution = versionResolution;
    const nameResolution = this.detectNameConflicts(
      endpoint,
      resolution.toRemote,
      resolution.toLocal,
      strategy,
    );
    return {
      ...nameResolution,
      conflicts: [
        ...(resolution.conflicts || []),
        ...(nameResolution.conflicts || []),
      ],
    };
  }

  /**
   * Résout les conflits de version selon une stratégie
   * @param {Array} toRemote - Entités locales
   * @param {Array} toLocal - Entités distantes
   * @param {string} strategy - Stratégie de résolution ('LAST_WRITE_WINS', 'LOCAL_WINS', 'REMOTE_WINS')
   * @returns {Object} Résolution des conflits
   */
  static detectVersionConflicts(
    endpoint = "",
    toRemote,
    toLocal,
    strategy = "LAST_WRITE_WINS",
  ) {
    const resolution = {
      toLocal: [], // Entités à appliquer localement
      toRemote: [], // Entités à envoyer au serveur
      conflicts: [], // Conflits non résolus
    };

    DebugService.warn(
      [`Starting conflict resolution with strategy: ${strategy}`],
      "sync",
    );

    // Processing local entities
    toRemote.forEach((localEntity) => {
      const remoteEntity = toLocal.find((re) => re.uuid === localEntity.uuid);
      if (!remoteEntity && localEntity?.isDirty) {
        // No remote entity, local is dirty → toRemote
        resolution.toRemote.push(localEntity);
      } else if (remoteEntity) {
        // Conflict detected
        DebugService.warn(
          [`Applying ${strategy} strategy for UUID: ${localEntity.uuid}`],
          "sync",
        );
        const resolved = this._applyConflictStrategy(
          localEntity,
          remoteEntity,
          strategy,
        );

        let keepedUuid = "";
        if (resolved.winner === "local") {
          keepedUuid = localEntity.uuid;
          resolution.toRemote.push(localEntity);
        } else if (resolved.winner === "remote") {
          keepedUuid = remoteEntity.uuid;
          resolution.toLocal.push(remoteEntity);
        } else {
          resolution.conflicts.push({
            local: localEntity,
            remote: remoteEntity,
            reason: resolved.reason,
          });
        }
        this.syncStore?.addOperationConflict(
          "version",
          endpoint,
          resolved.winner,
          keepedUuid,
        );
      }
    });

    // Processing remote entities
    toLocal.forEach((remoteEntity) => {
      const localEntity = toRemote.find((le) => le.uuid === remoteEntity.uuid);
      if (!localEntity) {
        resolution.toLocal.push(remoteEntity);
      }
    });

    return resolution;
  }

  /**
   * Excludes from export entities which will be overwritten by new remote with same name
   * @param {string} endpoint
   * @param {Array} toRemote
   * @param {Array} toLocal
   */
  static detectNameConflicts(endpoint = "", toRemote, toLocal) {
    const resolution = {
      toLocal: toLocal,
      toRemote: [],
      conflicts: [],
    };
    if (!["ingredients", "types"].includes(endpoint)) {
      // Name conflicts only for ingredients and types
      resolution.toRemote = toRemote;
      return resolution;
    }
    // Add remaining entities
    for (const localEntity of toRemote) {
      const conflictingRemoteEntity = toLocal.find(
        (remoteEntity) =>
          localEntity.name?.toLowerCase() ===
            remoteEntity.name?.toLowerCase() &&
          localEntity.uuid !== remoteEntity.uuid,
      );
      if (!conflictingRemoteEntity) {
        resolution.toRemote.push(localEntity);
      }
    }
    return resolution;
  }

  /**
   * Resolves name conflict by always deleting local conflicting entity
   * @param {Object} repository - Entity repository
   * @param {Object} entityToImport - Local entity
   */
  static async resolveNameImportConflict(
    endpoint,
    recipesRepository,
    entityToImport,
  ) {
    if (["ingredients", "types"].includes(endpoint)) {
      return { replacedCount: 0, relatedRecipesUuids: [] };
    }
    // Check for name conflict
    const conflictingLocal = await repository.getBy(
      "name",
      entityToImport.name,
    );
    if (conflictingLocal && conflictingLocal.uuid !== entityToImport.uuid) {
      return await recipesRepository.overwriteRecipesRelation(
        conflictingLocal.uuid,
        entityToImport.uuid,
        endpoint,
        true,
      );
    }
    return { replacedCount: 0, relatedRecipesUuids: [] };
  }

  /**
   * Applique une stratégie de résolution de conflit
   * @private
   */
  static _applyConflictStrategy(localEntity, remoteEntity, strategy) {
    switch (strategy) {
      case "LOCAL_WINS":
        return { winner: "local", reason: "Local wins strategy" };

      case "REMOTE_WINS":
        return { winner: "remote", reason: "Remote wins strategy" };

      case "LAST_WRITE_WINS":
      default:
        if (!localEntity.isDirty) {
          return { winner: "remote", reason: "Local entity is not dirty" };
        }

        const localDate = new Date(
          localEntity.dateModify || localEntity.dateAdd || 0,
        );
        const remoteDate = new Date(
          remoteEntity.dateModify || remoteEntity.dateAdd || 0,
        );
        DebugService.warn(
          `Comparing local date ${localDate} with remote date ${remoteDate} for entity UUID ${localEntity.uuid}`,
        );
        if (localDate > remoteDate) {
          return { winner: "local", reason: "Local entity is newer" };
        }
        if (remoteDate > localDate) {
          return { winner: "remote", reason: "Remote entity is newer" };
        }

        const dateReceived = new Date(remoteEntity.dateReceived);
        const lastSyncDate = new Date(localEntity.lastSyncDate);
        if (dateReceived === lastSyncDate) {
          return { winner: "none", reason: "No changes since last sync" };
        }
        // Dates identiques → utiliser la version
        const localVersion = localEntity.version || 0;
        const remoteVersion = remoteEntity.version || 0;

        if (localVersion > remoteVersion) {
          return { winner: "local", reason: "Local version is higher" };
        } else if (remoteVersion > localVersion) {
          return { winner: "remote", reason: "Remote version is higher" };
        } else {
          return { winner: "none", reason: "Identical dates and versions" };
        }
    }
  }
}
