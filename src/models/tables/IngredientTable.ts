import { IngredientStorage } from '@src/types/storage';
import { BaseSyncTable } from './BaseSyncTable';
import type { TableOptions } from './BaseTable';
import type { RecipeIngredientRelation } from './types';

/**
 * Local storage service for ingredients (IndexedDB)
 * Responsibility: Local data persistence only
 */
export class IngredientTable extends BaseSyncTable<IngredientStorage> {
  static defaultOptions: TableOptions = {
    sortBy: 'name',
    reverse: false,
  };

  /**
   * Gets ingredients used in recipes
   */
  async getUsed(filtersOnly: boolean = false): Promise<IngredientStorage[]> {
    const uniqueIngredientUuids = (await this.database.recipeIngredients
      .orderBy('ingredientUuid')
      .uniqueKeys()) as string[];
    if (uniqueIngredientUuids.length === 0) {
      return [];
    }

    const options: TableOptions = {
      sortBy: 'name',
    };
    if (filtersOnly) {
      options.and = (entity) =>
        (entity as IngredientStorage).excludeFromFilters !== 1;
    }
    const uniqueIngredients = await this.getAllBy(
      'uuid',
      uniqueIngredientUuids as string[],
      options,
    );
    return uniqueIngredients;
  }

  async getRelatedRecipesUuids(ingredientUuid: string): Promise<string[]> {
    const relations = (await this.database.recipeIngredients
      .where('ingredientUuid')
      .equals(ingredientUuid)
      .toArray()) as RecipeIngredientRelation[];
    return relations.map((relation) => relation.recipeUuid);
  }
}
