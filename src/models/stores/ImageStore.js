import { BaseStore } from './BaseStore';

/**
 * Service de stockage local pour les images (IndexedDB)
 * Responsabilité : Persistance des données locales uniquement
 */
export class ImageStore extends BaseStore {
  async getRelatedRecipesUuids(imageUuid) {
    return this.database.recipes.where('imageUuid').equals(imageUuid).toArray();
  }
}
