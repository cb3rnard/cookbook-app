import { BaseSyncStore } from './BaseSyncStore';

/**
 * Service de stockage local pour les ingrédients (IndexedDB)
 * Responsabilité : Persistance des données locales uniquement
 */
export class IngredientStore extends BaseSyncStore {
  static defaultOptions = {
    sortBy: 'name',
    reverse: false
  };

  /**
   * Récupère les ingrédients utilisés dans les recettes
   */
  async getUsed() {
    const uniqueIngredientUuids = await this.database.recipeIngredients.orderBy('ingredientUuid').uniqueKeys(function (keysArray) {
      return keysArray;
    });
    if (uniqueIngredientUuids.length === 0) {
      return [];
    }
    const uniqueIngredients = await this.getAllBy('uuid', uniqueIngredientUuids, { sortBy: 'name' });
    return uniqueIngredients;
  }

  async getRelatedRecipesUuids(ingredientUuid) {
    return this.database.recipeIngredients.where('ingredientUuid').equals(ingredientUuid).toArray().then(relations => {
      return relations.map(relation => relation.recipeUuid);
    });
  }
}
