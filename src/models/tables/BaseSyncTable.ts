import { LocalDirtyVersion } from '@src/types/entities';
import { EntitySyncableStorage } from '@src/types/storage';
import { BaseTable, type TableOptions } from './BaseTable';

/**
 * Base sync table for entities with synchronization support
 *
 * @template TEntityStorage
 */
export class BaseSyncTable<
  TEntityStorage extends EntitySyncableStorage = EntitySyncableStorage,
> extends BaseTable<TEntityStorage> {
  async getAll(
    options: TableOptions = {},
    withDeleted: boolean = false,
  ): Promise<TEntityStorage[]> {
    const {
      sortBy = this.defaultOptions.sortBy,
      reverse = this.defaultOptions.reverse,
    } = options;

    let query = this.databaseTable.toCollection();

    if (!withDeleted) {
      query = query.filter((entity) => !entity.dateDeleted);
    }
    if (sortBy !== 'uuid') {
      // sortBy() returns directly an Array, not a Collection
      const results = await query.sortBy(
        sortBy as keyof TEntityStorage & string,
      );
      return reverse ? results.reverse() : results;
    } else {
      // For default sorting, use toArray()
      const results = await query.toArray();
      return reverse ? results.reverse() : results;
    }
  }

  async getDirty(options: TableOptions = {}): Promise<TEntityStorage[]> {
    const { sortBy = this.defaultOptions.sortBy } = options;
    const results = await this.databaseTable
      .where('isDirty')
      .equals(1)
      .sortBy(sortBy as keyof TEntityStorage & string);
    return results;
  }

  async getDirtyUuids(): Promise<string[]> {
    const entities = await this.databaseTable
      .where('isDirty')
      .equals(1)
      .toArray();
    return entities.map((entity) => entity.uuid) as string[];
  }

  async getDirtyVersions(
    withDeleted: boolean = false,
  ): Promise<LocalDirtyVersion[]> {
    const entities = await this.databaseTable
      .where('isDirty')
      .equals(1)
      .toArray();
    const filteredEntities = withDeleted
      ? entities
      : entities.filter((entity) => !entity.dateDeleted);
    return filteredEntities.map(
      (entity) =>
        ({
          uuid: entity.uuid,
          version: entity.version,
          dateModify: entity.dateModify,
          dateDeleted: entity.dateDeleted,
          lastSyncDate: entity.lastSyncDate,
        }) as LocalDirtyVersion,
    );
  }

  async getDeleted(): Promise<TEntityStorage[]> {
    let query = await this.databaseTable.toCollection();
    return query.filter((entity) => !!entity.dateDeleted).toArray();
  }

  async countDirtyModified(): Promise<number> {
    return this.databaseTable
      .where('isDirty')
      .equals(1)
      .and((entity) => !entity.dateDeleted)
      .count();
  }

  async countDirtyDeleted(): Promise<number> {
    return this.databaseTable
      .where('isDirty')
      .equals(1)
      .and((entity) => !!entity.dateDeleted)
      .count();
  }

  async countDirtyNew(): Promise<number> {
    return this.databaseTable
      .where('isDirty')
      .equals(1)
      .and((entity) => !entity.dateDeleted && !entity.lastSyncDate)
      .count();
  }

  async count(withDeleted: boolean = false): Promise<number> {
    return withDeleted
      ? this.databaseTable.count()
      : this.databaseTable.filter((entity) => !entity.dateDeleted).count();
  }

  /**
   * Returns true if dateReceived >= lastSyncDate
   */
  async isSynced(uuid: string, dateReceived: string): Promise<boolean> {
    return (
      (await this.databaseTable
        .where('uuid')
        .equals(uuid)
        .and((entity) => {
          return Boolean(
            entity.lastSyncDate &&
              new Date(dateReceived) <= new Date(entity.lastSyncDate),
          );
        })
        .count()) > 0
    );
  }
}
