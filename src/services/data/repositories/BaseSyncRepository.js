import { ConnectionStore } from "../../stores/ConnectionStore.js";
import { SyncStore } from "../../stores/SyncStore.js";
import { BaseRepository } from "./BaseRepository.js";

/**
 * Strategy Offline-First : local d'abord, sync intelligente en arrière-plan
 */
export class BaseSyncRepository extends BaseRepository {
  constructor(database) {
    super(database);
    this.connectionStore = new ConnectionStore();
    this.syncStore = new SyncStore();
  }

  get canSync() {
    return this.connectionStore.canSync && this.syncStore.syncing === false;
  }

  async get(uuid, hydrate = {}, sync = true) {
    try {
      // 1. Toujours récupérer local d'abord
      const localEntityData = await this.table.get(uuid);
      const localEntity = await this._hydrate(localEntityData, hydrate);

      // 2. Si sync demandée et conditions remplies, demander sync via EventBus
      if (this.canSync && sync === true) {
        try {
          const syncedEntity = await this._requestEntitySync(
            localEntity.uuid,
            localEntity.isDirty,
            sync === "remoteOnly",
          );

          return syncedEntity || localEntity;
        } catch (error) {
          console.warn("Entity sync failed:", error);
          return localEntity;
        }
      }

      return localEntity;
    } catch (error) {
      console.error(`Failed to get ${this.EntityClass?.name} entity:`, error);
      throw error;
    }
  }

  async getAll(options = {}, hydrate = {}) {
    try {
      // Local d'abord
      const localEntitiesData = await this.table.getAll(options);
      const localEntities = await Promise.all(
        localEntitiesData.map(
          async (entityData) => await this._hydrate(entityData, hydrate),
        ),
      );

      return localEntities;
    } catch (error) {
      console.error(
        `Failed to get all ${this.EntityClass?.name} entities:`,
        error,
      );
      throw error;
    }
  }

  async getDirty(options = {}, hydrate = {}, withDeleted = false) {
    try {
      const results = await this.table.getDirty(options, withDeleted);
      return Promise.all(
        results.map(async (entityData) => {
          return await this._hydrate(entityData, hydrate);
        }),
      );
    } catch (error) {
      console.error(
        `Failed to get dirty ${this.EntityClass?.name} entities:`,
        error,
      );
      throw error;
    }
  }

  async getDirtyUuids(withDeleted = false) {
    try {
      return await this.table.getDirtyUuids(withDeleted);
    } catch (error) {
      console.error(
        `Failed to get dirty ${this.EntityClass?.name} entity UUIDs:`,
        error,
      );
      throw error;
    }
  }

  async getDirtyVersions(withDeleted = false) {
    try {
      return await this.table.getDirtyVersions(withDeleted);
    } catch (error) {
      console.error(
        `Failed to get dirty ${this.EntityClass?.name} entity versions:`,
        error,
      );
      throw error;
    }
  }

  async save(entityData, update = false, synced = false, untouched = false) {
    try {
      const isNew = !entityData.uuid;

      const entity =
        entityData instanceof this.EntityClass
          ? entityData
          : new this.EntityClass(entityData);

      if (isNew) {
        entity.setUuid();
      }
      await entity.validate(update);
      if (synced) {
        // Marque comme synchronisé
        entity.synced(synced);
      } else if (!untouched && !synced) {
        // Marque comme dirty et met à jour les dates
        entity.touch(isNew);
      }
      const savedEntity = await super.save(entity, update, true);

      if (!synced && this.canSync) {
        try {
          // Sync en arrière-plan
          const syncedEntity = await this._requestEntitySync(entity.uuid, true);
          return syncedEntity || savedEntity;
        } catch (error) {
          console.warn("Background sync request failed:", error);
        }
      }
      return savedEntity;
    } catch (error) {
      console.error(`Failed to save ${this.EntityClass?.name} entity:`, error);
      throw error;
    }
  }

  async update(entityData, synced = false) {
    try {
      return await this.save(entityData, true, synced);
    } catch (error) {
      console.error(
        `Failed to update ${this.EntityClass?.name} entity:`,
        error,
      );
      throw error;
    }
  }

  async touch(uuid) {
    try {
      return await this.update({ uuid }, false);
    } catch (error) {
      console.error(`Failed to touch ${this.EntityClass?.name} entity:`, error);
      throw error;
    }
  }

  async synced(uuid, synced = null) {
    try {
      if (!synced) {
        synced = new Date().toISOString();
      }
      return await this.update({ uuid }, synced);
    } catch (error) {
      console.error(
        `Failed to mark ${this.EntityClass?.name} entity as synced:`,
        error,
      );
      throw error;
    }
  }

  async markAllAsDirty(uuid) {
    return await this.table.markAllAsDirty;
  }

  async delete(uuid, synced = false, hardDelete = false) {
    try {
      // Delete from table if no API session or hard delete
      if (hardDelete || !this.connectionStore.hasActiveSession) {
        await this.table.delete(uuid);
      } else {
        // Mark as deleted for sync
        const dateDeleted = new Date().toISOString();
        await this.update({ uuid, dateDeleted }, synced);
      }
      return uuid;
    } catch (error) {
      console.error(
        `Failed to delete ${this.EntityClass?.name} entity:`,
        error,
      );
      throw error;
    }
  }

  async countDirtyModified() {
    try {
      return await this.table.countDirtyModified();
    } catch (error) {
      console.error(
        `Failed to count dirty modified ${this.EntityClass?.name} entities:`,
        error,
      );
      throw error;
    }
  }

  async countDirtyDeleted() {
    try {
      return await this.table.countDirtyDeleted();
    } catch (error) {
      console.error(
        `Failed to count dirty deleted ${this.EntityClass?.name} entities:`,
        error,
      );
      throw error;
    }
  }

  async isSynced(uuid, dateReceived) {
    try {
      return await this.table.isSynced(uuid, dateReceived);
    } catch (error) {
      console.error(
        `Failed to check if ${this.EntityClass?.name} entity is synced:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Demande une sync d'entité via EventBus
   * @private
   */
  async _requestEntitySync(uuid, isDirty = false, remoteOnly = false) {
    return new Promise((resolve) => {
      this.eventBus.emit("sync:request:entity", {
        endpoint: this.endpoint,
        uuid,
        isDirty,
        remoteOnly,
        callback: resolve,
      });
    });
  }
}
