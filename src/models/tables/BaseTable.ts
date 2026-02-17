import { Endpoint } from '@src/config/config.ts';
import { DebugService } from '@src/services/DebugService.ts';
import { EntityStorage, IngredientStorage } from '@src/types/storage.ts';
import { type Table } from 'dexie';
import { storageDatabase as database } from '../../services/StorageService';
import { EventBus } from '../../services/utils/EventBus.ts';

export interface TableOptions {
  sortBy?: string;
  reverse?: boolean;
  and?: (entity: EntityStorage) => boolean;
}

export interface GetAllByOptions extends TableOptions {}

/**
 * Base table class for Dexie database operations
 *
 * @template TEntityStorage - Type des données stockées (ex: RecipeData, IngredientStorage)
 */
export class BaseTable<TEntityStorage extends EntityStorage = EntityStorage> {
  static defaultOptions: TableOptions = {
    sortBy: 'uuid',
    reverse: false,
  };

  endpoint: Endpoint;
  database: any; // Dexie type causes deep instantiation issues - using any for dynamic table access
  databaseTable: Table<TEntityStorage>;
  eventBus: EventBus;
  defaultOptions: TableOptions;

  constructor(endpoint: Endpoint) {
    this.endpoint = endpoint;
    this.database = database;
    // Dynamic table access via endpoint name - requires 'as any' due to Dexie's dynamic schema
    this.databaseTable =
      database && endpoint ? (database as any)[endpoint] : null;
    const eventBus = EventBus.getInstance();
    this.eventBus = eventBus || null;
    this.defaultOptions = (this.constructor as typeof BaseTable)
      .defaultOptions || {
      sortBy: 'uuid',
      reverse: false,
    };
  }

  async get(uuid: string): Promise<TEntityStorage | undefined> {
    return this.databaseTable.get(uuid);
  }

  async getAllUuids(): Promise<string[]> {
    return this.databaseTable.toCollection().primaryKeys();
  }

  async getAll(options: TableOptions = {}): Promise<TEntityStorage[]> {
    const {
      sortBy = this.defaultOptions.sortBy,
      reverse = this.defaultOptions.reverse,
    } = options;

    let query = this.databaseTable.toCollection();
    if (sortBy !== 'uuid') {
      const results = await query.sortBy(
        sortBy as keyof TEntityStorage & string,
      );
      return reverse ? results.reverse() : results;
    } else {
      const results = await query.toArray();
      return reverse ? results.reverse() : results;
    }
  }

  async getAllBy(
    key: string,
    values: string[] | number[] | boolean[],
    options: GetAllByOptions = {},
  ): Promise<TEntityStorage[]> {
    const { sortBy = this.defaultOptions.sortBy } = options;
    const query = this.databaseTable.where(key).anyOf(values as any[]);
    if (options.and) {
      query.and((entity) => options.and!(entity as IngredientStorage));
    }
    const results = await query.sortBy(sortBy as keyof TEntityStorage & string);
    return options.reverse ? results.reverse() : results;
  }

  async count(): Promise<number> {
    return this.databaseTable.count();
  }

  async save(entityData: TEntityStorage): Promise<TEntityStorage> {
    // Dexie's put method handles both insert and update
    await this.databaseTable.put(entityData);
    DebugService.log(
      'storage',
      `Saved entity with UUID ${entityData.uuid}:`,
      entityData,
    );
    return entityData;
  }

  async update(
    entityData: Partial<TEntityStorage> & { uuid: string },
  ): Promise<Partial<TEntityStorage>> {
    await this.databaseTable.update(entityData.uuid, entityData as any);
    DebugService.log(
      'storage',
      `Updated entity with UUID ${entityData.uuid}:`,
      entityData,
    );
    return entityData as Partial<TEntityStorage>;
  }

  async saveBulk(
    entitiesData: TEntityStorage[],
  ): Promise<string | number | void> {
    // bulkPut handles both insert and update in Dexie
    return this.databaseTable.bulkPut(entitiesData as TEntityStorage[]);
  }

  async updateBulk(
    entitiesData: (Partial<TEntityStorage> & { uuid?: string })[],
  ): Promise<void> {
    const updatePromises = entitiesData.map((data) =>
      this.databaseTable.update(data.uuid, data as any),
    );
    await Promise.all(updatePromises);
  }

  async delete(uuid: string): Promise<void> {
    await this.databaseTable.delete(uuid);
    this.eventBus?.emit('entity:deleted', {
      endpoint: this.endpoint,
      uuid,
    });
  }

  async deleteAll(): Promise<void> {
    await this.databaseTable.clear();
    // this.eventBus?.emit("entities:cleared", {
    //   endpoint: this.endpoint,
    // });
  }
}
