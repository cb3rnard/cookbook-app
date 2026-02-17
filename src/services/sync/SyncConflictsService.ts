import {
  config,
  ConflictStrategy,
  EndpointRecipeRelationsDependencies,
  EndpointSyncable,
} from '@src/config/config.js';
import { EntitySyncable } from '@src/types/entities.js';
import { UniqueNameRepository } from '@src/types/repositories.js';
import {
  defaultSyncConflictResolution,
  EntitySyncableDataFromApi,
  SyncConflict,
  SyncConflictResolution,
} from '@src/types/sync.js';
import { RecipeRepository } from '../data/repositories/RecipeRepository.js';
import { DebugService } from '../DebugService.js';
import { SyncStore } from '../stores/SyncStore.js';

export class SyncConflictsService {
  static syncStore: SyncStore | null = null;

  // /**
  //  * Détecte les conflits entre UUIDs locaux et distants
  //  * @param {Object} localDirtyUuids - UUIDs dirty locaux par type
  //  * @param {Object} remoteDirtyUuids - UUIDs dirty distants par type
  //  * @returns {Object} Conflits détectés par type d'entité
  //  */
  // static detectConflictsFromUuids(localDirtyUuids: Record<EndpointSyncable, string[]>, remoteDirtyUuids: Record<EndpointSyncable, string[]>) {
  //   const conflicts = {
  //     recipes: [],
  //     ingredients: [],
  //     types: [],
  //     hasConflicts: false,
  //   } as Record<EndpointSyncable, Conflict[]> & { hasConflicts: boolean };

  //   config.ENDPOINTS_SYNCABLE.forEach((entityType: EndpointSyncable) => {
  //     const localEntities = localDirtyUuids[entityType] || [];
  //     const remoteEntities = remoteDirtyUuids[entityType] || [];

  //     // Trouver les UUIDs en conflit (présents dans les deux listes)
  //     const conflictUuids = localEntities.filter((localUuid) =>
  //       remoteEntities.includes(localUuid),
  //     );

  //     conflicts[entityType] = conflictUuids.map((uuid) => ({
  //       uuid,
  //       local: uuid,
  //       remote: uuid,
  //       entityType,
  //       conflictType: "version",
  //     }));
  //   });

  //   conflicts.hasConflicts = Object.values(conflicts).some(
  //     (entityConflicts) =>
  //       Array.isArray(entityConflicts) && entityConflicts.length > 0,
  //   );

  //   return conflicts;
  // }

  static detectConflicts(
    endpoint: EndpointSyncable,
    toRemote: EntitySyncable[],
    toLocal: EntitySyncableDataFromApi[],
    strategy: ConflictStrategy = 'LAST_WRITE_WINS',
  ): SyncConflictResolution {
    const {
      toRemote: versionsToRemote,
      toLocal: versionsToLocal,
      conflicts: versionConflicts,
    } = this.detectVersionConflicts(endpoint, toRemote, toLocal, strategy);
    const {
      toRemote: resolutionToRemote,
      toLocal: resolutionToLocal,
      conflicts: nameConflicts,
    } = this.detectNameConflicts(endpoint, versionsToRemote, versionsToLocal);
    DebugService.log(
      'sync',
      `Conflict detection completed for endpoint: ${endpoint}`,
      { toRemote, toLocal, conflicts: [...versionConflicts, ...nameConflicts] },
    );
    return {
      toRemote: resolutionToRemote,
      toLocal: resolutionToLocal,
      conflicts: [...versionConflicts, ...nameConflicts],
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
    endpoint: EndpointSyncable,
    toRemote: EntitySyncable[],
    toLocal: EntitySyncableDataFromApi[],
    strategy: ConflictStrategy = 'LAST_WRITE_WINS',
  ): SyncConflictResolution {
    const resolution: SyncConflictResolution = {
      toLocal: [],
      toRemote: [],
      conflicts: [],
    };

    DebugService.log(
      'sync',
      `Starting conflict resolution with strategy: ${strategy}`,
    );

    // Processing local entities
    toRemote.forEach((localEntity) => {
      const remoteEntity = toLocal.find((re) => re.uuid === localEntity.uuid);
      if (!remoteEntity && localEntity.isDirty) {
        // No remote entity, local is dirty → toRemote
        resolution.toRemote.push(localEntity);
      } else if (remoteEntity) {
        // Conflict detected
        DebugService.log(
          'sync',
          `Applying ${strategy} strategy for UUID: ${localEntity.uuid}`,
        );
        const resolved = this._applyConflictStrategy(
          localEntity,
          remoteEntity,
          strategy,
        );

        if (resolved.winner === 'local') {
          resolution.toRemote.push(localEntity);
        } else if (resolved.winner === 'remote') {
          resolution.toLocal.push(remoteEntity);
        }
        resolution.conflicts.push({
          type: 'version',
          endpoint: endpoint,
          winner: resolved.winner,
          reason: resolved.reason,
          localUuid: localEntity.uuid,
          remoteUuid: remoteEntity.uuid,
        });
      }
    });

    // Processing remote entities
    toLocal.forEach((remoteEntity) => {
      const localEntity = toRemote.find((le) => le.uuid === remoteEntity.uuid);
      if (!localEntity) {
        // No local entity found, add to import list
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
  static detectNameConflicts(
    endpoint: EndpointSyncable,
    toRemote: EntitySyncable[],
    toLocal: EntitySyncableDataFromApi[],
  ): SyncConflictResolution {
    if (!config.ENDPOINTS_UNIQUE_NAMES.find((e) => e === endpoint))
      return { ...defaultSyncConflictResolution, toLocal, toRemote };

    const conflicts: SyncConflict[] = [];

    for (const localEntity of toRemote) {
      const conflictingRemoteEntity = toLocal.find(
        (remoteEntity) =>
          localEntity.name?.toLowerCase() ===
            remoteEntity.name?.toLowerCase() &&
          localEntity.uuid !== remoteEntity.uuid,
      );
      // If no conflict, keep local entity for export
      if (conflictingRemoteEntity) {
        toRemote.filter((entity) => entity.uuid !== localEntity.uuid);
        conflicts.push({
          type: 'name',
          endpoint: endpoint,
          winner: 'remote',
          reason: `Remote entity with same name "${conflictingRemoteEntity.name}" will overwrite local entity`,
          localUuid: localEntity.uuid,
          remoteUuid: conflictingRemoteEntity.uuid,
        });
      }
    }
    return { toLocal, toRemote, conflicts };
  }

  /**
   * Resolves name conflict by always deleting local conflicting entity
   * @param {Object} repository - Entity repository
   * @param {Object} entityToImport - Local entity
   */
  static async resolveNameImportConflict(
    repository: UniqueNameRepository,
    recipesRepository: RecipeRepository,
    entityToImport: EntitySyncableDataFromApi,
  ) {
    if (config.ENDPOINTS_UNIQUE_NAMES.find((e) => e === repository.endpoint)) {
      return { replacedCount: 0, relatedRecipesUuids: [] };
    }
    // Check for name conflict
    const conflictingLocals = await repository.getAllBy('name', [
      entityToImport.name ?? '',
    ]);
    const conflictingLocal = conflictingLocals.find(
      (local) => local.uuid !== entityToImport.uuid,
    );
    if (conflictingLocal) {
      return recipesRepository.overwriteRecipesRelation(
        conflictingLocal.uuid,
        entityToImport.uuid,
        repository.endpoint as EndpointRecipeRelationsDependencies,
        true,
      );
    }
    return { replacedCount: 0, relatedRecipesUuids: [] };
  }

  /**
   * Applique une stratégie de résolution de conflit
   * @private
   */
  static _applyConflictStrategy(
    localEntity: EntitySyncable,
    remoteEntity: EntitySyncableDataFromApi,
    strategy: ConflictStrategy,
  ): { winner: 'local' | 'remote' | 'none'; reason: string } {
    switch (strategy) {
      case 'LOCAL_WINS':
        return { winner: 'local', reason: 'Local wins strategy' };

      case 'REMOTE_WINS':
        return { winner: 'remote', reason: 'Remote wins strategy' };

      case 'LAST_WRITE_WINS':
      default:
        if (!localEntity.isDirty) {
          return { winner: 'remote', reason: 'Local entity is not dirty' };
        }

        const localDate = new Date(
          localEntity.dateModify || localEntity.dateAdd || 0,
        );
        const remoteDate = new Date(
          remoteEntity.dateModify || remoteEntity.dateAdd || 0,
        );
        DebugService.log(
          'sync',
          `Comparing local date ${localDate} with remote date ${remoteDate} for entity UUID ${localEntity.uuid}`,
        );
        if (localDate > remoteDate) {
          return { winner: 'local', reason: 'Local entity is newer' };
        }
        if (remoteDate > localDate) {
          return { winner: 'remote', reason: 'Remote entity is newer' };
        }

        const dateReceived = new Date(remoteEntity.dateReceived);
        const lastSyncDate = new Date(localEntity.lastSyncDate);
        if (dateReceived === lastSyncDate) {
          return { winner: 'none', reason: 'No changes since last sync' };
        }
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
