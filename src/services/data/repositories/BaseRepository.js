import { DebugService } from "../../DebugService";
import { EventBus } from "../../utils/EventBus";

/**
 * Strategy de base pour gérer l'accès aux entités local ou remote
 */
export class BaseRepository {
  static endpoint = "";
  static TableClass = null;
  static EntityClass = null;

  constructor() {
    this.EntityClass = this.constructor.EntityClass;
    this.endpoint = this.constructor.endpoint;
    this.table = new this.constructor.TableClass(this.endpoint);
    this.eventBus = EventBus.getInstance();
  }

  async get(uuid, hydrate = {}) {
    try {
      const entity = await this.table.get(uuid);
      const hydratedEntity = await this._hydrate(entity, hydrate);
      DebugService.log(
        [`Fetched entity with UUID ${uuid}:`, hydratedEntity],
        "data",
      );
      return hydratedEntity;
    } catch (error) {
      console.error(`Failed to get entity:`, error);
      throw error;
    }
  }

  async getBy(key, value, options = {}, hydrate = {}) {
    const results = await this.table.getAllBy(key, [value], options, hydrate);
    return results.length > 0 ? results[0] : null;
  }

  async getAll(options = {}, hydrate = {}) {
    try {
      const entities = await this.table.getAll(options);
      const hydratedEntities = await Promise.all(
        entities.map(async (entity) => await this._hydrate(entity, hydrate)),
      );
      return hydratedEntities;
    } catch (error) {
      console.error(
        `Failed to get all ${this.EntityClass?.name} entities:`,
        error,
      );
      throw error;
    }
  }

  async getAllBy(key, values, options = {}, hydrate = {}) {
    try {
      const entities = await this.table.getAllBy(key, values, options);
      const hydratedEntities = await Promise.all(
        entities.map(async (entity) => await this._hydrate(entity, hydrate)),
      );
      return hydratedEntities;
    } catch (error) {
      console.error(
        `Failed to get ${this.EntityClass?.name} entities by ${key}:`,
        error,
      );
      throw error;
    }
  }

  async getByUuids(uuids, options = {}, hydrate = {}) {
    try {
      const entities = await this.table.getAllBy("uuid", uuids, options);
      const hydratedEntities = await Promise.all(
        entities.map(async (entity) => await this._hydrate(entity, hydrate)),
      );
      return hydratedEntities;
    } catch (error) {
      console.error(
        `Failed to get ${this.EntityClass?.name} entities by UUIDs:`,
        error,
      );
      throw error;
    }
  }

  async count(withDeleted = false) {
    try {
      return await this.table.count(withDeleted);
    } catch (error) {
      console.error(
        `Failed to count ${this.EntityClass?.name} entities:`,
        error,
      );
      throw error;
    }
  }

  async save(entityData, update = false, skipValidation = false) {
    try {
      const entity = this.constructEntity(entityData);
      if (!skipValidation) {
        await entity.validate(update);
      }
      const entityToStorage = update
        ? entity.toStorageUpdate()
        : entity.toStorage();
      console.log(
        "BaseRepository.save called with data:",
        entityData,
        "update:",
        update,
        "skipValidation:",
        skipValidation,
      );
      console.log(entityToStorage);
      await this.table.save(entityToStorage, update);
      this.eventBus.emit("entity:saved", {
        endpoint: this.endpoint,
        entityData: entityToStorage,
      });
      return entity;
    } catch (error) {
      console.error(`Failed to save ${this.EntityClass?.name} entity:`, error);
      throw error;
    }
  }

  async saveBulk(entitiesData, update = false) {
    try {
      const entities = entitiesData.map((data) => this.constructEntity(data));
      const entitiesToStorage = await Promise.all(
        entities.map(async (entity) => {
          await entity.validate(update);
          return update ? entity.toStorageUpdate() : entity.toStorage();
        }),
      );
      return await this.table.saveBulk(entitiesToStorage, update);
    } catch (error) {
      console.error(
        `Failed to save bulk ${this.EntityClass?.name} entities:`,
        error,
      );
      throw error;
    }
  }

  async update(entityData) {
    try {
      return await this.save(entityData, true);
    } catch (error) {
      console.error(
        `Failed to update ${this.EntityClass?.name} entity:`,
        error,
      );
      throw error;
    }
  }

  async delete(uuid) {
    try {
      return await this.table.delete(uuid);
    } catch (error) {
      console.error(
        `Failed to delete ${this.EntityClass?.name} entity:`,
        error,
      );
      throw error;
    }
  }

  async deleteAll() {
    try {
      return await this.table.deleteAll();
    } catch (error) {
      console.error(
        `Failed to delete all ${this.EntityClass?.name} entities:`,
        error,
      );
      throw error;
    }
  }

  async _hydrate(entityData, hydrate = {}) {
    return hydrate.construct
      ? this.constructEntity(entityData, { construct: true })
      : entityData;
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
