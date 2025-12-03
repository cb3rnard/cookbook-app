import { storageDatabase as database } from "../../services/StorageService";
import { EventBus } from "../../services/utils/EventBus.js";

export class BaseTable {
  static defaultOptions = {
    sortBy: "uuid",
    reverse: false,
  };

  constructor(endpoint = null) {
    this.endpoint = endpoint;
    this.database = database;
    // Dexie table
    this.databaseTable = database && endpoint ? database[endpoint] : null;
    this.eventBus = EventBus.getInstance();
    this.defaultOptions = this.constructor.defaultOptions || {
      sortBy: "uuid",
      reverse: false,
    };
  }

  async get(uuid) {
    return await this.databaseTable.get(uuid);
  }

  async getAll(options = {}) {
    const {
      sortBy = this.defaultOptions.sortBy,
      reverse = this.defaultOptions.reverse,
    } = options;

    let query = this.databaseTable.toCollection();
    if (sortBy !== "uuid") {
      const results = await query.sortBy(sortBy);
      return reverse ? results.reverse() : results;
    } else {
      const results = await query.toArray();
      return reverse ? results.reverse() : results;
    }
  }

  async getAllBy(key, values, options = {}, hydrate = {}) {
    const { sortBy = this.defaultOptions.sortBy } = options;
    const results = await this.databaseTable
      .where(key)
      .anyOf(values)
      .sortBy(sortBy);
    return options.reverse ? results.reverse() : results;
  }

  async count() {
    await this.databaseTable.count();
  }

  async save(entityData, update = false) {
    if (update) {
      await this.databaseTable.update(entityData.uuid, entityData);
    } else {
      await this.databaseTable.put(entityData);
    }
    return entityData;
  }

  async saveBulk(entitiesData, update = false) {
    return update
      ? await this.databaseTable.bulkUpdate(entitiesData)
      : await this.databaseTable.bulkPut(entitiesData);
  }

  async delete(uuid) {
    await this.databaseTable.delete(uuid);
    this.eventBus?.emit("entity:deleted", {
      endpoint: this.endpoint,
      uuid,
    });
    return uuid;
  }

  async deleteAll() {
    await this.databaseTable.clear();
    this.eventBus?.emit("entities:cleared", {
      entityType: this.endpoint?.name,
    });
  }
}
