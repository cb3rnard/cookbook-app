import { EventBus } from '../../services/utils/EventBus.js';

export class BaseStore {
  static defaultOptions = {
    sortBy: 'uuid',
    reverse: false
  };

  constructor(endpoint = null, database = null, eventBus = null) {
    this.endpoint = endpoint;
    this.database = database;
    this.table = (database && endpoint ? database[endpoint] : null);
    this.eventBus = eventBus || EventBus.getInstance();
    this.defaultOptions = this.constructor.defaultOptions || {
      sortBy: 'uuid',
      reverse: false
    };
  }

  async get(uuid) {
    return await this.table.get(uuid);
  }

  async getAll(options = {}) {
    const { sortBy = this.defaultOptions.sortBy, reverse = this.defaultOptions.reverse } = options;

    let query = this.table.toCollection();
    if (sortBy !== 'uuid') {
      const results = await query.sortBy(sortBy);
      return reverse ? results.reverse() : results;
    } else {
      const results = await query.toArray();
      return reverse ? results.reverse() : results;
    }
  }

  async getAllBy(key, values, options = {}, hydrate = {}) {
    const { sortBy = this.defaultOptions.sortBy } = options;
    const results = await this.table.where(key).anyOf(values).sortBy(sortBy);
    return options.reverse ? results.reverse() : results;
  }

  async count() {
    await this.table.count();
  }

  async save(entityData, update = false) {
    if (update) {
      await this.table.update(entityData.uuid, entityData)
    } else {
      await this.table.put(entityData);
    }
    return entityData;
  }

  async saveBulk(entitiesData, update = false) {
    return update ? await this.store.updateBulk(entitiesData) : await this.store.saveBulk(entitiesData);
  }

  async delete(uuid) {
    await this.table.delete(uuid);
    this.eventBus?.emit('entity:deleted', {
      endpoint: this.endpoint,
      uuid
    });
    return uuid;
  }

  async deleteAll() {
    await this.table.clear();
    this.eventBus?.emit('entities:cleared', {
      entityType: this.endpoint?.name
    });
  }
}