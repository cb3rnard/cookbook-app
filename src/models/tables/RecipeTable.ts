import { EndpointRecipeRelationsDependencies } from '@src/config/config';
import { DifficultyLevels, RecipeTypeData } from '@src/types/entities';
import { RecipeFilters } from '@src/types/repositories';
import {
  RecipeIngredientStorage,
  RecipeRelationsStorage,
  RecipeStorage,
  RecipeTypeStorage,
} from '@src/types/storage';
import { DebugService } from '../../services/DebugService';
import { BaseSyncTable } from './BaseSyncTable';
import type { TableOptions } from './BaseTable';

/**
 * Check if recipe filters are empty
 */
export function isRecipeFiltersEmpty(filters: RecipeFilters): boolean {
  if (!filters) return true;

  const hasSearch = filters.search && filters.search.trim().length > 0;
  const hasIngredients = filters.ingredients && filters.ingredients.length > 0;
  const hasTypes = filters.types && filters.types.length > 0;
  const hasDifficulties =
    filters.difficulties && filters.difficulties.length > 0;
  const hasDeleted = filters.deleted !== undefined;

  return (
    !hasSearch &&
    !hasIngredients &&
    !hasTypes &&
    !hasDifficulties &&
    !hasDeleted
  );
}

/**
 * Local storage service for recipes (IndexedDB)
 * Responsibility: Local data persistence + business logic + synchronization
 */
export class RecipeTable extends BaseSyncTable<RecipeStorage> {
  static defaultOptions: TableOptions = {
    sortBy: 'dateModify',
    reverse: true,
  };

  /**
   * Deletes a recipe
   */
  async delete(uuid: string): Promise<void> {
    const recipe = await this.get(uuid);
    const imageUuid = recipe ? recipe.imageUuid : null;

    await super.delete(uuid);
    // Delete related entities within a transaction
    await this.database.transaction(
      'rw',
      [
        this.databaseTable!,
        this.database.recipeIngredients,
        this.database.recipeTypes,
        this.database.notes,
        this.database.images,
      ],
      async () => {
        await this.database.recipeIngredients
          .where('recipeUuid')
          .equals(uuid)
          .delete();
        await this.database.recipeTypes
          .where('recipeUuid')
          .equals(uuid)
          .delete();
        await this.database.notes.where('recipeUuid').equals(uuid).delete();
        if (imageUuid) {
          await this.database.images.delete(imageUuid);
        }
      },
    );
  }

  async filter(
    filters: RecipeFilters,
    fromSet: RecipeStorage[] = [],
  ): Promise<RecipeStorage[]> {
    if (isRecipeFiltersEmpty(filters)) {
      const result = fromSet.length > 0 ? fromSet : await this.getAll();
      return result;
    }

    DebugService.log('storage', 'Filtering recipes with filters:', filters);
    let recipes: RecipeStorage[] = [];

    const ingredientsUuids = filters.ingredients || [];
    const typesUuids = filters.types || [];

    if (ingredientsUuids.length > 0 || typesUuids.length > 0) {
      if (fromSet.length > 0) {
        const fromSetUuids = fromSet.map((recipe) => recipe.uuid);

        const recipeIngredients = await this.database.recipeIngredients
          .where('ingredientUuid')
          .anyOf(ingredientsUuids)
          .and((ri: RecipeIngredientStorage) =>
            fromSetUuids.includes(ri.recipeUuid),
          )
          .toArray();

        const recipeTypes = await this.database.recipeTypes
          .where('typeUuid')
          .anyOf(typesUuids)
          .and((rt: RecipeTypeStorage) => fromSetUuids.includes(rt.recipeUuid))
          .toArray();

        const recipeUuidsFromIngredients = recipeIngredients.map(
          (ri: RecipeIngredientStorage) => ri.recipeUuid,
        );
        const recipeUuidsFromTypes = recipeTypes.map(
          (rt: RecipeTypeStorage) => rt.recipeUuid,
        );

        const filteredRecipeUuids = [
          ...new Set([...recipeUuidsFromIngredients, ...recipeUuidsFromTypes]),
        ];

        recipes = await this.databaseTable!.where('uuid')
          .anyOf(filteredRecipeUuids)
          .toArray();
      } else {
        const recipeIngredients = await this.database.recipeIngredients
          .where('ingredientUuid')
          .anyOf(ingredientsUuids)
          .toArray();
        const recipeTypes = await this.database.recipeTypes
          .where('typeUuid')
          .anyOf(typesUuids)
          .toArray();
        const recipeUuidsFromIngredients = recipeIngredients.map(
          (ri: RecipeIngredientStorage) => ri.recipeUuid,
        );
        const recipeUuidsFromTypes = recipeTypes.map(
          (rt: RecipeTypeStorage) => rt.recipeUuid,
        );

        const filteredRecipeUuids = [
          ...new Set([...recipeUuidsFromIngredients, ...recipeUuidsFromTypes]),
        ];

        recipes = await this.databaseTable!.where('uuid')
          .anyOf(filteredRecipeUuids)
          .toArray();
      }

      if (!filters.deleted) {
        recipes = recipes.filter((recipe) => !recipe.dateDeleted);
      }
    } else {
      recipes =
        fromSet.length > 0
          ? fromSet
          : await this.getAll({}, filters.deleted || false);
    }

    // Difficulty level
    if (filters.difficulties && filters.difficulties.length > 0) {
      recipes = recipes.filter((recipe) =>
        filters.difficulties!.includes(recipe.difficulty),
      );
    }

    return recipes;
  }

  /**
   * Gets used difficulty levels
   */
  async getUsedDifficultyLevels(): Promise<DifficultyLevels[]> {
    try {
      return (await this.databaseTable
        .orderBy('difficulty')
        .uniqueKeys()) as DifficultyLevels[];
    } catch (error) {
      return [];
    }
  }

  async getRecipeIngredients(
    recipeUuid: string,
  ): Promise<RecipeIngredientStorage[]> {
    return this.database.recipeIngredients
      .where('recipeUuid')
      .equals(recipeUuid)
      .toArray();
  }

  async getRecipeTypes(recipeUuid: string): Promise<RecipeTypeStorage[]> {
    return this.database.recipeTypes
      .where('recipeUuid')
      .equals(recipeUuid)
      .toArray();
  }

  /**
   * Saves recipe ingredients
   */
  async saveRecipeIngredients(
    recipeUuid: string,
    recipeIngredients: Partial<RecipeIngredientStorage>[],
    deleteOld: boolean = true,
  ): Promise<string | number | void> {
    // Delete old ingredients linked to the recipe
    if (deleteOld) {
      await this.database.recipeIngredients
        .where('recipeUuid')
        .equals(recipeUuid)
        .delete();
    }

    if (recipeIngredients && recipeIngredients.length > 0) {
      const filteredRecipeIngredients = recipeIngredients
        .map((recipeIngredient) => {
          const ingredientUuid = recipeIngredient.ingredientUuid || null;

          return {
            ingredientUuid: ingredientUuid,
            recipeUuid: recipeUuid,
            quantity: recipeIngredient.quantity,
            unit: recipeIngredient.unit,
            note: recipeIngredient.note,
          };
        })
        .filter(
          (recipeIngredient) =>
            recipeIngredient.ingredientUuid || recipeIngredient.note,
        );

      return this.database.recipeIngredients.bulkPut(
        filteredRecipeIngredients as RecipeIngredientStorage[],
      );
    }
    return Promise.resolve();
  }

  /**
   * Saves recipe types
   */
  async saveRecipeTypes(
    recipeUuid: string,
    recipeTypes: RecipeTypeData[],
    deleteOld: boolean = true,
  ): Promise<number> {
    // Delete old types linked to the recipe
    if (deleteOld) {
      await this.database.recipeTypes
        .where('recipeUuid')
        .equals(recipeUuid)
        .delete();
    }

    if (recipeTypes && recipeTypes.length > 0) {
      const uniqueRecipeTypesMap = new Map<string, RecipeTypeStorage>();
      recipeTypes.forEach((recipeType) => {
        uniqueRecipeTypesMap.set(recipeType.typeUuid, {
          typeUuid: recipeType.typeUuid,
          recipeUuid: recipeUuid,
        });
      });
      const filteredRecipeTypes = Array.from(uniqueRecipeTypesMap.values());

      return this.database.recipeTypes.bulkPut(filteredRecipeTypes);
    }
    return Promise.resolve(0);
  }

  /**
   * Replace recipes related entities (ingredients/recipeIngredients
   * or types/recipeTypes)
   * @param endpoint - 'ingredients' or 'types'
   * @param oldUuid - UUID to replace
   * @param newUuid - UUID to use as replacement
   * @return - { replacedCount, relatedRecipesUuids }
   */
  async replaceRecipesRelation(
    oldUuid: string,
    newUuid: string,
    endpoint: EndpointRecipeRelationsDependencies,
  ): Promise<{ replacedCount: number; relatedRecipesUuids: string[] }> {
    const relationConfig = {
      ingredients: {
        key: 'ingredientUuid',
        table: this.database.recipeIngredients,
      },
      types: {
        key: 'typeUuid',
        table: this.database.recipeTypes,
      },
    } as const;

    const config = relationConfig[endpoint as keyof typeof relationConfig];
    const relationTable = config.table;
    const relationUuidKey = config.key;

    const relations: RecipeRelationsStorage[] = await relationTable
      .where(relationUuidKey)
      .equals(oldUuid)
      .toArray();

    const replacedCount = await relationTable
      .where(relationUuidKey)
      .equals(oldUuid)
      .modify((obj: RecipeRelationsStorage) => {
        obj[relationUuidKey as keyof RecipeRelationsStorage] = newUuid;
      });

    const recipesUuid = relations.map((row) => row.recipeUuid);

    // Return unique values
    const uniqueRecipesUuid = [...new Set(recipesUuid)];

    return {
      replacedCount,
      relatedRecipesUuids: uniqueRecipesUuid as string[],
    };
  }

  async deleteRecipeNotes(recipeUuid: string): Promise<number> {
    return this.database.notes.where('recipeUuid').equals(recipeUuid).delete();
  }
}
