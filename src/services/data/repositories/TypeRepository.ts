import { EndpointSyncable } from '@src/config/config.js';
import { TypeData } from '@src/types/entities.js';
import { TypeStorage } from '@src/types/storage.js';
import { Type } from '../../../models/entities/Type.js';
import { TypeTable } from '../../../models/tables/TypeTable.js';
import { BaseSyncRepository } from './BaseSyncRepository.js';

export class TypeRepository extends BaseSyncRepository<
  TypeData,
  TypeStorage,
  Type,
  TypeTable
> {
  static _endpoint: EndpointSyncable = 'types';
  static _TableClass = TypeTable;
  static _EntityClass = Type;

  async getUsed(): Promise<Type[]> {
    const entitiesData = await this.table.getUsed();
    return entitiesData.map((entityData) => this.constructEntity(entityData));
  }
}
