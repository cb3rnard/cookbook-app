import { ImageStorage } from '@src/types/storage';
import { BaseTable } from './BaseTable';

/**
 * Local storage service for images (IndexedDB)
 * Responsibility: Local data persistence only
 */
export class ImageTable extends BaseTable<ImageStorage> {
  async getRelatedRecipesUuids(imageUuid: string): Promise<string[]> {
    return this.database.recipes
      .where('imageUuid')
      .equals(imageUuid)
      .primaryKeys() as Promise<string[]>;
  }
}
