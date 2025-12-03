import { BaseTable } from "./BaseTable";

/**
 * Service de stockage local pour les images (IndexedDB)
 * Responsabilité : Persistance des données locales uniquement
 */
export class ImageTable extends BaseTable {
  async getRelatedRecipesUuids(imageUuid) {
    return this.database.recipes.where("imageUuid").equals(imageUuid).toArray();
  }
}
