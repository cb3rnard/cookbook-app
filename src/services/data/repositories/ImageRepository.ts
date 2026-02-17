import { Endpoint } from '@src/config/config.js';
import { Recipe } from '@src/models/entities/Recipe.js';
import { ImageData } from '@src/types/entities.js';
import { ImageStorage } from '@src/types/storage.js';
import { Image } from '../../../models/entities/Image.js';
import { ImageTable } from '../../../models/tables/ImageTable.js';
import { BaseRepository } from './BaseRepository.js';

export class ImageRepository extends BaseRepository<
  ImageData,
  ImageStorage,
  Image,
  ImageTable
> {
  static _endpoint: Endpoint = 'images';
  static _TableClass = ImageTable;
  static _EntityClass = Image;

  async delete(
    image: Image | string,
    skipRelatedUpdates = false,
  ): Promise<void> {
    if (!skipRelatedUpdates) {
      // Réinitialiser le champ imageUuid s'il est relié à une recette
      const relatedRecipesUuids = await this.table.getRelatedRecipesUuids(
        typeof image === 'string' ? image : image.uuid,
      );
      if (relatedRecipesUuids && relatedRecipesUuids.length > 0) {
        const recipeRepository = this.repositories.recipes;
        const recipesUuids = relatedRecipesUuids.map(
          (recipeUuid) => recipeUuid,
        );

        for (const recipeUuid of recipesUuids) {
          const recipeUpdate = new Recipe(
            { uuid: recipeUuid, imageUuid: '' },
            true,
          );
          await recipeRepository.update(recipeUpdate, true);
        }
      }
    }

    // Supprimer l'image et émettre l'événement
    await super.delete(image);
  }
}
