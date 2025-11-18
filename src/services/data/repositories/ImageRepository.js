import { Image } from '../../../models/entities/Image.js';
import { ImageStore } from '../../../models/stores/ImageStore.js';
import { BaseRepository } from './BaseRepository.js';

export class ImageRepository extends BaseRepository {
    static endpoint = 'images';
    static StoreClass = ImageStore;
    static EntityClass = Image;

    async delete(imageUuid) {
        try {
            // Réinitialiser le champ imageUuid s'il est relié à une recette
            const relatedRecipes = await this.store.getRelatedRecipesUuids(imageUuid);

            if (relatedRecipes && relatedRecipes.length > 0) {
                const recipeRepository = this.repositories.recipes;
                const recipesUuids = relatedRecipes.map(recipe => recipe.uuid);

                for (const recipeUuid of recipesUuids) {
                    await recipeRepository.update(recipeUuid, { imageUuid: null });
                }
            }

            // Supprimer l'image et émettre l'événement
            await this.delete(imageUuid);
            this.events.emit('image:deleted', imageUuid);

            return imageUuid;
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'image:', error);
            throw error;
        }
    }
}