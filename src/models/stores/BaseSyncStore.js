import { BaseStore } from './BaseStore.js';

export class BaseSyncStore extends BaseStore {
  // Synchronise et renvoie l'entité 
  async getAll(options = {}, withDeleted = false) {
    const {
      sortBy = this.defaultOptions.sortBy,
      reverse = this.defaultOptions.reverse
    } = options;

    let query = this.table.toCollection();

    if (!withDeleted) {
      query = query.filter(entity => !entity.dateDeleted);
    }
    if (sortBy !== 'uuid') {
      // sortBy() retourne directement un Array, pas une Collection
      const results = await query.sortBy(sortBy);
      return reverse ? results.reverse() : results;
    } else {
      // Pour le tri par défaut, on utilise toArray()
      const results = await query.toArray();
      return reverse ? results.reverse() : results;
    }
  }

  async getDirty($options = {}, withDeleted = false) {
    const { sortBy = this.defaultOptions.sortBy, reverse = this.defaultOptions.reverse } = $options;
    const results = await this.table.where('isDirty').equals(1).sortBy(sortBy);
    return results;
  }

  async getDirtyUuids(withDeleted = false) {
    const dirtyEntities = await this.table.where('isDirty').equals(1).toArray();
    if (!withDeleted) {
      dirtyEntities.filter(entity => !entity.dateDeleted);
    }
    return dirtyEntities.map(entity => entity.uuid);
  }

  async count(withDeleted = false) {
    return withDeleted
      ? await this.table.count()
      : await this.table.filter(entity => !entity.dateDeleted).count();
  }
}