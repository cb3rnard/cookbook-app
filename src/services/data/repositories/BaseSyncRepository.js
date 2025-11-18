import { BaseRepository } from './BaseRepository.js';

/**
 * Strategy Offline-First : local d'abord, sync intelligente en arrière-plan
 */
export class BaseSyncRepository extends BaseRepository {
    constructor(database, eventBus, connectionStatus = null) {
        super(database, eventBus);
        this.connectionStatus = connectionStatus;
    }

    get canUseSync() {
        return this.connectionStatus?.canSync || false;
    }

    async get(uuid, hydrate = {}, sync = true) {
        try {

            // 1. Toujours récupérer local d'abord
            const localEntityData = await this.store.get(uuid);
            const localEntity = await this._hydrate(localEntityData, hydrate);

            // 2. Si sync demandée et conditions remplies, demander sync via EventBus
            if (this.canUseSync && sync === true) {
                try {
                    const syncedEntity = await this._maybeSyncEntity(localEntity, hydrate);

                    return syncedEntity || localEntity;
                } catch (error) {
                    console.warn('Entity sync failed:', error);
                    return localEntity;
                }
            }

            return localEntity;
        } catch (error) {
            console.error(`Failed to get ${this.EntityClass?.name} entity:`, error);
            throw error;
        }
    }

    async getAll(options = {}, hydrate = {}, sync = true) {
        try {
            // Local d'abord
            const localEntitiesData = await this.store.getAll(options);
            const localEntities = await Promise.all(localEntitiesData.map(async entityData => await this._hydrate(entityData, hydrate)));

            if (this.canUseSync && sync) {
                this._backgroundSyncAll().catch(err => {
                    console.warn('Background sync all failed (sync disabled or auth required):', err);
                });
            }
            return localEntities;
        } catch (error) {
            console.error(`Failed to get all ${this.EntityClass?.name} entities:`, error);
            throw error;
        }
    }

    async getDirty(options = {}, hydrate = {}, withDeleted = false) {
        try {
            const results = await this.store.getDirty(options, withDeleted);
            return Promise.all(results.map(async (entityData) => {
                return await this._hydrate(entityData, hydrate);
            }));
        } catch (error) {
            console.error(`Failed to get dirty ${this.EntityClass?.name} entities:`, error);
            throw error;
        }
    }

    async getDirtyUuids(withDeleted = false) {
        try {
            return await this.store.getDirtyUuids(withDeleted);
        } catch (error) {
            console.error(`Failed to get dirty ${this.EntityClass?.name} entity UUIDs:`, error);
            throw error;
        }
    }

    async save(entityData, update = false, synced = false) {
        try {
            const isNew = !entityData.uuid;

            const entity = entityData instanceof this.EntityClass
                ? entityData
                : new this.EntityClass(entityData);

            if (isNew) {
                entity.setUuid();
            }
            await entity.validate(update);
            if (synced) {
                // Marque comme synchronisé
                entity.synced(synced);
            } else {
                // Marque comme dirty et met à jour les dates
                entity.touch(isNew);
            }
            const savedEntity = await super.save(entity, update, true);

            try {
                if (!synced && this.canUseSync) {
                    // Sync en arrière-plan
                    const syncedEntity = await this._requestEntitySync(entity.uuid);
                    return syncedEntity || savedEntity;
                }
            } catch (error) {
                console.warn('Background sync request failed:', error);
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
            console.error(`Failed to update ${this.EntityClass?.name} entity:`, error);
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
            console.error(`Failed to mark ${this.EntityClass?.name} entity as synced:`, error);
            throw error;
        }
    }

    async markAllAsDirty(uuid) {
        return await this.store.markAllAsDirty
    }

    async delete(uuid, synced = false) {
        try {
            if (this.isAuthenticated) {
                const dateDeleted = new Date().toISOString();
                await this.update({ uuid, dateDeleted });
                return uuid;
            } else {
                await this.store.delete(uuid);
            }
        } catch (error) {
            console.error(`Failed to delete ${this.EntityClass?.name} entity:`, error);
            throw error;
        }
    }

    /**
     * Sync intelligente d'une entité si dirty ou synchronisée il y a plus de 1h
     * @private
     */
    async _maybeSyncEntity(entityData, hydrate = {}) {
        if (!entityData.isDirty && (!entityData.lastSyncDate || Date.now() - new Date(entityData.lastSyncDate) < 3600000)) {
            // Pas besoin de sync
            return entityData;
        }
        try {
            return await this._requestEntitySync(entityData.uuid, hydrate);
        } catch (error) {
            console.warn('Entity sync failed:', error);
            return await this._hydrate(entityData, hydrate);
        }
    }


    /**
     * Demande une sync d'entité via EventBus
     * @private
     */
    async _requestEntitySync(uuid, hydrate = {}) {
        return new Promise((resolve) => {
            this.events.emit('entity:sync:request', {
                endpoint: this.endpoint,
                uuid,
                hydrate,
                callback: resolve
            });
        });
    }

    async _backgroundSyncAll() {
        // Pour plus tard - sync intelligent basé sur dirty flags
    }
}