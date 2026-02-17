import { TypeStorage } from '@src/types/storage';
import { Type } from '../entities/Type';
import { BaseSyncTable } from './BaseSyncTable';
import type { TableOptions } from './BaseTable';
import type { RecipeTypeRelation } from './types';

/**
 * Local storage service for types (IndexedDB)
 * Responsibility: Local data persistence only
 */
export class TypeTable extends BaseSyncTable<TypeStorage> {
  static EntityClass = Type;
  static endpoint = 'types';
  static defaultOptions: TableOptions = {
    sortBy: 'name',
    reverse: false,
  };

  /**
   * Gets types used in recipes
   */
  async getUsed(): Promise<TypeStorage[]> {
    const uniqueTypeUuids = (await this.database.recipeTypes
      .orderBy('typeUuid')
      .uniqueKeys()) as string[];
    if (uniqueTypeUuids.length === 0) {
      return [];
    }
    const uniqueTypes = await this.getAllBy('uuid', uniqueTypeUuids, {
      sortBy: 'name',
    });
    return uniqueTypes;
  }

  async getRelatedRecipesUuids(typeUuid: string): Promise<string[]> {
    const relations = (await this.database.recipeTypes
      .where('typeUuid')
      .equals(typeUuid)
      .toArray()) as RecipeTypeRelation[];
    return relations.map((relation) => relation.recipeUuid);
  }
}
