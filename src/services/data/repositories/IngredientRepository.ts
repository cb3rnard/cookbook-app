import { EndpointSyncable } from '@src/config/config.js';
import { IngredientData } from '@src/types/entities.js';
import { IngredientStorage } from '@src/types/storage.js';
import { Ingredient } from '../../../models/entities/Ingredient.js';
import { IngredientTable } from '../../../models/tables/IngredientTable.js';
import { BaseSyncRepository } from './BaseSyncRepository.js';

export class IngredientRepository extends BaseSyncRepository<
  IngredientData,
  IngredientStorage,
  Ingredient,
  IngredientTable
> {
  static _endpoint: EndpointSyncable = 'ingredients';
  static _TableClass = IngredientTable;
  static _EntityClass = Ingredient;

  async getUsed(filtersOnly = false): Promise<Ingredient[]> {
    const entitiesData = await this.table.getUsed(filtersOnly);
    return entitiesData.map((entityData) => this.constructEntity(entityData));
  }
}
