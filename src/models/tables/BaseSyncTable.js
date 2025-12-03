import { BaseTable } from "./BaseTable.js";

export class BaseSyncTable extends BaseTable {
  // Synchronise et renvoie l'entité
  async getAll(options = {}, withDeleted = false) {
    const {
      sortBy = this.defaultOptions.sortBy,
      reverse = this.defaultOptions.reverse,
    } = options;

    let query = this.databaseTable.toCollection();

    if (!withDeleted) {
      query = query.filter((entity) => !entity.dateDeleted);
    }
    if (sortBy !== "uuid") {
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
    const {
      sortBy = this.defaultOptions.sortBy,
      reverse = this.defaultOptions.reverse,
    } = $options;
    const results = await this.databaseTable
      .where("isDirty")
      .equals(1)
      .sortBy(sortBy);
    return results;
  }

  async getDirtyUuids(withDeleted = false) {
    const entities = await this.databaseTable
      .where("isDirty")
      .equals(1)
      .toArray();
    if (!withDeleted) {
      entities.filter((entity) => !entity.dateDeleted);
    }
    return entities.map((entity) => entity.uuid);
  }

  async getDirtyVersions(withDeleted = false) {
    const entities = await this.databaseTable
      .where("isDirty")
      .equals(1)
      .toArray();
    const filteredEntities = withDeleted
      ? entities
      : entities.filter((entity) => !entity.dateDeleted);
    return filteredEntities.map((entity) => ({
      uuid: entity.uuid,
      version: entity.version,
      dateModified: entity.dateModified,
      dateDeleted: entity.dateDeleted,
      lastSyncDate: entity.lastSyncDate,
    }));
  }

  async countDirtyModified() {
    return await this.databaseTable
      .where("isDirty")
      .equals(1)
      .and((entity) => !entity.dateDeleted)
      .count();
  }

  async countDirtyDeleted() {
    return await this.databaseTable
      .where("isDirty")
      .equals(1)
      .and((entity) => entity.dateDeleted)
      .count();
  }

  async count(withDeleted = false) {
    return withDeleted
      ? await this.databaseTable.count()
      : await this.databaseTable
          .filter((entity) => !entity.dateDeleted)
          .count();
  }

  /**
   * Returns true if dateReceived >= lastSyncDate
   * @param {string} uuid
   * @param {string} dateReceived
   * @returns
   */
  async isSynced(uuid, dateReceived) {
    return (
      (await this.databaseTable
        .where("uuid")
        .equals(uuid)
        .and((entity) => {
          return (
            entity.lastSyncDate &&
            new Date(dateReceived) <= new Date(entity.lastSyncDate)
          );
        })
        .count()) > 0
    );
  }
}
