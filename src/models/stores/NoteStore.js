import { BaseStore } from './BaseStore';

/**
 * Service de stockage local pour les notes (IndexedDB)
 * Responsabilité : Persistance des données locales uniquement
 */
export class NoteStore extends BaseStore {
  static defaultOptions = {
    sortBy: 'dateAdd',
    reverse: true
  }

  async getNotesByRecipeUuid(recipeUuid) {
    return await this.table.where('recipeUuid').equals(recipeUuid).toArray();
  }
}
