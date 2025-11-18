import { DebugService } from "../../DebugService";

/**
 * Strategy de base pour gérer l'accès aux entités local ou remote
 */
export class BaseRepository {
    static endpoint = '';
    static StoreClass = null;
    static EntityClass = null;

    constructor(database, eventBus) {
        this.EntityClass = this.constructor.EntityClass;
        this.endpoint = this.constructor.endpoint;
        this.store = new this.constructor.StoreClass(this.endpoint, database, eventBus);
        this.events = eventBus;
    }

    async get(uuid, hydrate = {}) {
        try {
            const entity = await this.store.get(uuid);
            const hydratedEntity = await this._hydrate(entity, hydrate);
            DebugService.log([`Fetched entity with UUID ${uuid}:`, hydratedEntity], 'data');
            return hydratedEntity;
        } catch (error) {
            console.error(`Failed to get entity:`, error);
            throw error;
        }
    }

    async getAll(options = {}, hydrate = {}) {
        try {
            const entities = await this.store.getAll(options);
            const hydratedEntities = await Promise.all(entities.map(async entity => await this._hydrate(entity, hydrate)));
            return hydratedEntities;
        } catch (error) {
            console.error(`Failed to get all ${this.EntityClass?.name} entities:`, error);
            throw error;
        }
    }

    async getAllBy(key, values, options = {}, hydrate = {}) {
        try {
            const entities = await this.store.getAllBy(key, values, options);
            const hydratedEntities = await Promise.all(entities.map(async entity => await this._hydrate(entity, hydrate)));
            return hydratedEntities;
        } catch (error) {
            console.error(`Failed to get ${this.EntityClass?.name} entities by ${key}:`, error);
            throw error;
        }
    }

    async getByUuids(uuids, options = {}, hydrate = {}) {
        try {
            const entities = await this.store.getAllBy('uuid', uuids, options);
            const hydratedEntities = await Promise.all(entities.map(async entity => await this._hydrate(entity, hydrate)));
            return hydratedEntities;
        } catch (error) {
            console.error(`Failed to get ${this.EntityClass?.name} entities by UUIDs:`, error);
            throw error;
        }
    }

    async count(withDeleted = false) {
        try {
            return await this.store.count(withDeleted);
        } catch (error) {
            console.error(`Failed to count ${this.EntityClass?.name} entities:`, error);
            throw error;
        }
    }

    async save(entityData, update = false, skipValidation = false) {
        try {
            const entity = this.constructEntity(entityData);
            if (!skipValidation) {
                await entity.validate(update);
            }
            const entityToStorage = update ? entity.toStorageUpdate() : entity.toStorage();
            await this.store.save(entityToStorage, update);
            this.events.emit('entity:saved', { endpoint: this.endpoint, entityData: entityToStorage });
            return entity;
        } catch (error) {
            console.error(`Failed to save ${this.EntityClass?.name} entity:`, error);
            throw error;
        }
    }

    async saveBulk(entitiesData, update = false) {
        try {
            const entities = entitiesData.map(data => this.constructEntity(data));
            const entitiesToStorage = await Promise.all(entities.map(async (entity) => {
                await entity.validate(update);
                return update ? entity.toStorageUpdate() : entity.toStorage();
            }));
            return await this.store.saveBulk(entitiesToStorage, update);
        } catch (error) {
            console.error(`Failed to save bulk ${this.EntityClass?.name} entities:`, error);
            throw error;
        }
    }

    async update(entityData) {
        try {
            return await this.save(entityData, true);
        } catch (error) {
            console.error(`Failed to update ${this.EntityClass?.name} entity:`, error);
            throw error;
        }
    }

    async delete(uuid) {
        try {
            return await this.store.delete(uuid);
        } catch (error) {
            console.error(`Failed to delete ${this.EntityClass?.name} entity:`, error);
            throw error;
        }
    }

    async deleteAll() {
        try {
            return await this.store.deleteAll();
        } catch (error) {
            console.error(`Failed to delete all ${this.EntityClass?.name} entities:`, error);
            throw error;
        }
    }

    async _hydrate(entityData, hydrate = {}) {
        return hydrate.construct ? this.constructEntity(entityData, { construct: true }) : entityData;
    }

    constructEntity(entityData) {
        if (this.EntityClass) {
            return entityData instanceof this.EntityClass
                ? entityData
                : new this.EntityClass(entityData);
        }
        return entityData;
    }

    setRepositoriesRegistry(registry) {
        this.repositories = Object.fromEntries(registry);
    }
}