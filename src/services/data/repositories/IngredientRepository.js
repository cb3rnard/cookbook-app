import { Ingredient } from "../../../models/entities/Ingredient.js";
import { IngredientTable } from "../../../models/tables/IngredientTable.js";
import { BaseSyncRepository } from "./BaseSyncRepository.js";

export class IngredientRepository extends BaseSyncRepository {
  static endpoint = "ingredients";
  static TableClass = IngredientTable;
  static EntityClass = Ingredient;

  async getUsed() {
    try {
      return this.table.getUsed();
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des ingrédients utilisés:",
        error,
      );
      throw error;
    }
  }

  async delete(ingredientUuid, synced = false) {
    try {
      const relatedRecipes =
        await this.table.getRelatedRecipesUuids(ingredientUuid);

      if (relatedRecipes && relatedRecipes.length > 0) {
        const recipeRepository = this.repositories.recipes;
        const recipesUuids = relatedRecipes;

        for (const recipeUuid of recipesUuids) {
          await recipeRepository.update(recipeUuid, { ingredientUuids: null });
        }
      }

      // Supprimer l'ingrédient et émettre l'événement
      await this.delete(ingredientUuid, synced);
      this.eventBus.emit("ingredient:deleted", ingredientUuid);

      return ingredientUuid;
    } catch (error) {
      console.error("Erreur lors de la suppression de l'ingrédient:", error);
      throw error;
    }
  }
}
