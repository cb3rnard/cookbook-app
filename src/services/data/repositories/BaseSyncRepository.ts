import { EndpointSyncable } from '@src/config/config.js';
import { BaseSyncTable } from '@src/models/tables/BaseSyncTable.js';
import { DebugService } from '@src/services/DebugService.js';
import {
  EntitySyncable,
  EntitySyncableConstructor,
  EntitySyncableData,
} from '@src/types/entities.js';
import { HydrateOptions } from '@src/types/repositories.js';
import { EntitySyncableStorage } from '@src/types/storage.js';
import { TableConstructor } from '@src/types/tables.js';
import { ConnectionStore } from '../../stores/ConnectionStore.js';
import { SyncStore } from '../../stores/SyncStore.js';
import { BaseRepository } from './BaseRepository.js';

/**
 * Strategy Offline-First : local d'abord, sync intelligente en arrière-plan
 *
 * @template TEntityData - Type des données sync (ex: RecipeData extends BaseSyncEntityData)
 * @template TEntity - Type de l'entité sync (ex: Recipe extends BaseSyncEntity)
 * @template TTable - Type de la table sync (ex: RecipeTable extends BaseSyncTable)
 */
export class BaseSyncRepository<
  TEntityData extends EntitySyncableData = EntitySyncableData,
  TEntityStorage extends EntitySyncableStorage = EntitySyncableStorage,
  TEntity extends EntitySyncable = EntitySyncable,
  TTable extends BaseSyncTable = BaseSyncTable,
> extends BaseRepository<TEntityData, TEntityStorage, TEntity, TTable> {
  static _endpoint: EndpointSyncable;
  static _TableClass: TableConstructor<any>;
  static _EntityClass: EntitySyncableConstructor<any>;

  declare endpoint: EndpointSyncable;
  declare table: TTable;
  declare EntityClass: EntitySyncableConstructor<TEntity>;

  connectionStore: ConnectionStore;
  syncStore: SyncStore;

  constructor() {
    super();
    this.connectionStore = new ConnectionStore();
    this.syncStore = new SyncStore();
  }

  get canSync() {
    return this.connectionStore.canSync && this.syncStore.syncing === false;
  }

  async get(
    uuid: string,
    hydrate: Partial<HydrateOptions> = {},
    sync = true,
  ): Promise<TEntity | null> {
    try {
      // 1. Toujours récupérer local d'abord
      const localEntityData = (await this.table.get(uuid)) as
        | TEntityStorage
        | undefined;
      if (!localEntityData) {
        return null;
      }

      // 2. Si sync demandée et conditions remplies, demander sync via EventBus
      if (this.canSync && sync === true) {
        try {
          await this._requestEntitySync(uuid, !!localEntityData.isDirty, false);
          // Relire les données après sync
          const syncedEntityData = (await this.table.get(uuid)) as
            | TEntityStorage
            | undefined;
          if (syncedEntityData) {
            const hydratedData = (await this._hydrate(
              syncedEntityData,
              hydrate,
            )) as TEntityData;
            return this.constructEntity(hydratedData);
          } else {
            return null;
          }
        } catch (error) {
          console.warn('Entity sync failed:', error);
        }
      }

      const hydratedData = (await this._hydrate(
        localEntityData,
        hydrate,
      )) as TEntityData;
      DebugService.log(
        'storage',
        `Fetched entity with UUID ${uuid}:`,
        hydratedData,
      );
      return this.constructEntity(hydratedData);
    } catch (error) {
      console.error(`Failed to get ${this.EntityClass?.name} entity:`, error);
      throw error;
    }
  }

  async getAll(
    options = {},
    hydrate: Partial<HydrateOptions> = {},
    withDeleted = true,
  ): Promise<TEntity[]> {
    // Local d'abord
    const localEntitiesData = (await this.table.getAll(
      options,
      withDeleted,
    )) as TEntityStorage[];
    const localEntities = await Promise.all(
      localEntitiesData.map(async (entityData) => {
        const hydratedData = (await this._hydrate(
          entityData,
          hydrate,
        )) as TEntityData;
        return this.constructEntity(hydratedData);
      }),
    );

    return localEntities;
  }

  async getDirty(options = {}, hydrate = {}): Promise<TEntity[]> {
    const results = (await this.table.getDirty(options)) as TEntityStorage[];
    return Promise.all(
      results.map(async (entityData) => {
        const hydratedData = (await this._hydrate(
          entityData,
          hydrate,
        )) as TEntityData;
        return this.constructEntity(hydratedData);
      }),
    );
  }

  async getDirtyUuids() {
    return this.table.getDirtyUuids();
  }

  async getDirtyVersions(withDeleted = false) {
    return this.table.getDirtyVersions(withDeleted);
  }

  async getDeleted() {
    return this.table.getDeleted();
  }

  /**
   * Prépare une entité avant sauvegarde/mise à jour
   * Gère les timestamps de sync (synced/dirty)
   * @private
   */
  private _prepareSyncEntity(
    entity: EntitySyncable,
    synced: string,
    isNew: boolean,
    untouched = false,
  ): void {
    if (synced) {
      if (synced === 'presave') {
        // Marque comme dirty sans mettre à jour les dates ni version
        entity.touch(false, true);
      } else {
        // Marque comme synchronisé
        entity.synced(synced);
      }
    } else if (!untouched) {
      // Marque comme dirty et met à jour les dates
      entity.touch(isNew);
    }
  }

  /**
   * Déclenche une synchronisation en arrière-plan si nécessaire
   * @private
   */
  private async _triggerBackgroundSync(
    uuid: string,
    synced = '',
  ): Promise<void> {
    if (!synced && this.canSync) {
      try {
        await this._requestEntitySync(uuid, true);
      } catch (error) {
        console.warn('Background sync request failed:', error);
      }
    }
  }

  async save(
    entity: TEntity,
    skipValidation = false,
    synced = '',
    untouched = false,
    sync = true,
  ): Promise<void> {
    try {
      const isNew = !entity.uuid;

      if (isNew) {
        entity.setUuid();
      }
      if (!skipValidation) {
        await entity.validate(false);
      }

      this._prepareSyncEntity(entity, synced, isNew, untouched);

      // Save directly to table, bypassing BaseRepository.save() logic
      // which would incorrectly redirect to update() for entities with UUID
      const entityToStorage = entity.toStorage();
      DebugService.log(
        'storage',
        'Saving sync entity to storage:',
        entityToStorage,
      );

      if (!isNew && synced === '') {
        // Local modification of existing entity
        await super.update(entity, true);
      } else {
        // New entity or import - save to table directly
        await this.table.save(entityToStorage as any);
        this.eventBus.emit('entity:saved', {
          endpoint: this.endpoint,
          entity: entity,
        });
        entity.clearChanged();
      }

      if (sync === true) {
        await this._triggerBackgroundSync(entity.uuid!, synced);
      }
    } catch (error) {
      console.error(`Failed to save ${this.EntityClass?.name} entity:`, error);
      throw error;
    }
  }

  async update(
    entity: TEntity,
    skipValidation = false,
    synced = '',
    sync = true,
  ): Promise<void> {
    try {
      this._prepareSyncEntity(entity, synced, false);

      await super.update(entity, skipValidation);

      if (sync === true) {
        await this._triggerBackgroundSync(entity.uuid!, synced);
      }
    } catch (error) {
      console.error(
        `Failed to update ${this.EntityClass?.name} entity:`,
        error,
      );
      throw error;
    }
  }

  async touch(entity: string | TEntity): Promise<void> {
    // We need to get the entity to correctly increment version
    const resolvedEntity =
      typeof entity === 'string' ? await this.get(entity, {}, false) : entity;

    if (!resolvedEntity) {
      throw new Error('Entity not found for touch operation');
    }
    resolvedEntity.touch();
    await super.update(resolvedEntity, true);
  }

  async synced(entity: string | TEntity, synced = ''): Promise<void> {
    if (!synced) {
      synced = new Date().toISOString();
    }
    if (typeof entity === 'string') {
      entity = this.constructEntity({ uuid: entity } as TEntityData);
    }
    entity.synced(synced);
    await super.update(entity, true);

    // Émettre l'événement entity:synced
    this.eventBus.emit('entity:synced', {
      endpoint: this.endpoint as any,
      uuid: entity.uuid,
      lastSyncDate: synced,
    });
  }

  /**
   * Deletes an entity, either hard delete or marking as deleted for sync
   * @param entity Entity or UUID to delete
   * @param synced Date of synchronization
   * @param hardDelete If true, performs a hard delete
   */
  async delete(
    entity: TEntity | string,
    synced: string = '',
    hardDelete = false,
  ): Promise<void> {
    try {
      if (typeof entity === 'string') {
        entity = (await this.get(entity, {}, false)) as TEntity;
        if (!entity) {
          throw new Error('Entity not found for delete operation');
        }
      }
      // Delete from table if no API session or hard delete
      if (hardDelete || !this.connectionStore.hasActiveSession) {
        await this.table.delete(entity.uuid);
      } else {
        // Mark as deleted for sync
        const dateDeleted = new Date().toISOString();
        entity.dateDeleted = dateDeleted;
        await this.update(entity, true, synced);
      }
      entity.clearChanged();
    } catch (error) {
      console.error(
        `Failed to delete ${this.EntityClass?.name} entity:`,
        error,
      );
      throw error;
    }
  }

  async restore(entity: TEntity | string, synced = ''): Promise<void> {
    if (typeof entity === 'string') {
      entity = (await this.constructEntity(
        { uuid: entity, dateDeleted: '' } as TEntityData,
        true,
      )) as TEntity;
    } else {
      entity.dateDeleted = '';
    }
    // Remove dateDeleted to restore
    await this.update(entity, false, synced);
    entity.clearChanged();
  }

  async count(withDeleted = false): Promise<number> {
    return this.table.count(withDeleted);
  }

  async countDirtyModified(): Promise<number> {
    return this.table.countDirtyModified();
  }

  async countDirtyDeleted(): Promise<number> {
    return this.table.countDirtyDeleted();
  }

  async countDirtyNew(): Promise<number> {
    return this.table.countDirtyNew();
  }

  async isSynced(uuid: string, dateReceived: string): Promise<boolean> {
    return this.table.isSynced(uuid, dateReceived);
  }

  /**
   * Requests an single entity sync via EventBus
   * @private
   */
  async _requestEntitySync(
    uuid: string,
    isDirty = false,
    remoteOnly = false,
  ): Promise<void> {
    return new Promise((resolve) => {
      this.eventBus.emit('sync:request:entity', {
        endpoint: this.endpoint,
        uuid,
        isDirty,
        remoteOnly,
        callback: resolve,
      });
    });
  }
}
