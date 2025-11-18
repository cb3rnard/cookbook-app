import { Ingredient } from '../../../models/entities/Ingredient.js';
import { IngredientStore } from '../../../models/stores/IngredientStore.js';
import { BaseSyncRepository } from './BaseSyncRepository.js';

export class IngredientRepository extends BaseSyncRepository {
    static endpoint = 'ingredients';
    static StoreClass = IngredientStore;
    static EntityClass = Ingredient;

    async getUsed() {
        try {
            return this.store.getUsed();
        } catch (error) {
            console.error('Erreur lors de la récupération des ingrédients utilisés:', error);
            throw error;
        }
    }

    async delete(ingredientUuid, synced = false) {
        try {
            const relatedRecipes = await this.store.getRelatedRecipesUuids(ingredientUuid);

            if (relatedRecipes && relatedRecipes.length > 0) {
                const recipeRepository = this.repositories.recipes;
                const recipesUuids = relatedRecipes;

                for (const recipeUuid of recipesUuids) {
                    await recipeRepository.update(recipeUuid, { ingredientUuids: null });
                }
            }

            // Supprimer l'ingrédient et émettre l'événement
            await this.delete(ingredientUuid, synced);
            this.events.emit('ingredient:deleted', ingredientUuid);

            return ingredientUuid;
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'ingrédient:', error);
            throw error;
        }
    }
}