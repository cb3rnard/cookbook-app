import { Endpoint } from '@src/config/config.ts';
import { BaseTable, TableOptions } from '@src/models/tables/BaseTable.ts';
import { Entity, EntityConstructor, EntityData } from '@src/types/entities.ts';
import {
  HydrateOptions,
  RepositoriesRecords,
  Repository,
} from '@src/types/repositories.ts';
import { EntityStorage } from '@src/types/storage.ts';
import { EntitySyncableDataFromApi } from '@src/types/sync.ts';
import { TableConstructor } from '@src/types/tables.ts';
import { DebugService } from '../../DebugService.js';
import { EventBus } from '../../utils/EventBus.ts';

/**
 * Global repository class providing basic CRUD operations.
 * Uses the related Table class which interacts with Dexie storage
 *
 * @template TEntityData
 * @template TEntityStorage
 * @template TEntity
 * @template TTable
 */
export class BaseRepository<
  TEntityData extends EntityData = EntityData,
  TEntityStorage extends EntityStorage = EntityStorage,
  TEntity extends Entity = Entity,
  TTable extends BaseTable = BaseTable,
> {
  static _endpoint: Endpoint;
  static _TableClass: TableConstructor<any>;
  static _EntityClass: EntityConstructor<any>;

  endpoint!: Endpoint;
  table: TTable;

  EntityClass: EntityConstructor<TEntity>;
  eventBus: EventBus;
  repositories!: RepositoriesRecords;

  constructor(repositories?: Map<Endpoint, Repository>) {
    const currentClass = this.constructor as typeof BaseRepository;
    this.EntityClass = currentClass._EntityClass;
    this.endpoint = currentClass._endpoint as Endpoint;
    this.table = new currentClass._TableClass(this.endpoint) as TTable;
    this.eventBus = EventBus.getInstance();

    // Initialize repositories if provided
    if (repositories) {
      this.setRepositoriesRegistry(repositories);
    }
  }

  async get(
    uuid: string,
    hydrate: Partial<HydrateOptions> = {},
  ): Promise<TEntity | null> {
    const entityData = (await this.table.get(uuid)) as
      | TEntityStorage
      | undefined;
    if (!entityData) {
      return null;
    }
    const hydratedData = (await this._hydrate(
      entityData,
      hydrate,
    )) as TEntityData;
    DebugService.log(
      'storage',
      `Fetched entity with UUID ${uuid}:`,
      hydratedData,
    );
    return this.constructEntity(hydratedData);
  }

  async getAll(
    options: TableOptions = {},
    hydrate: Partial<HydrateOptions> = {},
  ): Promise<TEntity[]> {
    const entitiesData = (await this.table.getAll(options)) as TEntityStorage[];
    const hydratedEntities = await Promise.all(
      entitiesData.map(async (entityData) => {
        const hydratedData = (await this._hydrate(
          entityData,
          hydrate,
        )) as TEntityData;
        return this.constructEntity(hydratedData);
      }),
    );
    return hydratedEntities;
  }

  async getAllUuids() {
    return this.table.getAllUuids();
  }

  async getAllBy(
    key: string,
    values: string[] | number[] | boolean[],
    options: TableOptions = {},
    hydrate: Partial<HydrateOptions> = {},
  ): Promise<TEntity[]> {
    const entitiesData = (await this.table.getAllBy(
      key,
      values,
      options,
    )) as TEntityStorage[];
    const hydratedEntities = await Promise.all(
      entitiesData.map(async (entityData) => {
        const hydratedData = (await this._hydrate(
          entityData,
          hydrate,
        )) as TEntityData;
        return this.constructEntity(hydratedData);
      }),
    );
    return hydratedEntities;
  }

  async getByUuids(
    uuids: string[],
    options: TableOptions = {},
    hydrate: Partial<HydrateOptions> = {},
  ): Promise<TEntity[]> {
    const entitiesData = (await this.table.getAllBy(
      'uuid',
      uuids,
      options,
    )) as TEntityStorage[];
    const hydratedEntities = await Promise.all(
      entitiesData.map(async (entityData) => {
        const hydratedData = (await this._hydrate(
          entityData,
          hydrate,
        )) as TEntityData;
        return this.constructEntity(hydratedData);
      }),
    );
    return hydratedEntities;
  }

  async count() {
    return this.table.count();
  }

  async save(entity: TEntity, skipValidation = false): Promise<void> {
    // Création → validation complète
    if (!skipValidation) {
      await entity.validate({}, false);
    }
    const entityToStorage = entity.toStorage() as TEntityStorage;
    DebugService.log('storage', 'Saving entity to storage:', entityToStorage);

    await this.table.save(entityToStorage);
    this.eventBus.emit('entity:saved', {
      endpoint: this.endpoint,
      entity: entity,
    });
    entity.clearChanged();
  }

  async update(entity: TEntity, skipValidation = false) {
    if (!skipValidation) {
      await entity.validate({}, true);
    }
    const entityToStorage = entity.toStorageUpdate();
    DebugService.log('storage', 'Updating entity in storage:', entityToStorage);

    await this.table.update(entityToStorage);
    this.eventBus.emit('entity:updated', {
      endpoint: this.endpoint,
      entityData: entity.toDataUpdate(),
      entity,
    });
    entity.clearChanged();
  }

  async saveBulk(entitiesData: Partial<TEntityData>[]): Promise<void> {
    const entities = entitiesData.map((data) => this.constructEntity(data));
    const entitiesToStorage = entities.map((entity) => {
      entity.validate(false);
      return entity.toStorage();
    });
    await this.table.saveBulk(entitiesToStorage as EntityStorage[]);
    entities.forEach((entity) => entity.clearChanged());
  }

  async updateBulk(entitiesData: Partial<TEntityData>[]): Promise<void> {
    const entities = entitiesData.map((data) => this.constructEntity(data));
    const entitiesToStorage = entities.map((entity) => {
      entity.validate(true);
      return entity.toStorageUpdate();
    });
    await this.table.updateBulk(entitiesToStorage);
    entities.forEach((entity) => entity.clearChanged());
  }

  async delete(entity: TEntity | string): Promise<void> {
    await this.table.delete(typeof entity === 'string' ? entity : entity.uuid);
    if (typeof entity !== 'string') {
      entity.clearChanged();
    }

    this.eventBus?.emit('entity:deleted', {
      endpoint: this.endpoint,
      uuid: typeof entity === 'string' ? entity : entity.uuid,
    });
  }

  async deleteAll() {
    return this.table.deleteAll();
  }

  async _hydrate(
    entityData: (Partial<TEntityData> & { uuid: string }) | TEntityStorage,
    _hydrate: Partial<HydrateOptions> = {},
  ): Promise<Partial<TEntityData>> {
    // Hydrate enrichit uniquement les données (relations, etc.)
    // Pas de construction ici - c'est le rôle de constructEntity()
    return entityData as Partial<TEntityData>;
  }

  constructEntity(
    entityData:
      | Partial<TEntityData>
      | Partial<TEntityStorage>
      | TEntity
      | Partial<EntitySyncableDataFromApi>,
    asUpdate: boolean = false,
  ): TEntity {
    return (
      entityData instanceof this.EntityClass
        ? entityData
        : new this.EntityClass(entityData, asUpdate)
    ) as TEntity;
  }

  setRepositoriesRegistry(registry: Map<Endpoint, Repository>) {
    // Convert Map to Record - assumes all endpoints are provided
    this.repositories = Object.fromEntries(registry) as RepositoriesRecords;
  }
}
