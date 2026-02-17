import { NoteStorage } from '@src/types/storage';
import { BaseTable, type TableOptions } from './BaseTable';

/**
 * Local storage service for notes (IndexedDB)
 * Responsibility: Local data persistence only
 */
export class NoteTable extends BaseTable<NoteStorage> {
  static defaultOptions: TableOptions = {
    sortBy: 'dateAdd',
    reverse: true,
  };

  async getNotesByRecipeUuid(recipeUuid: string): Promise<NoteStorage[]> {
    return this.databaseTable.where('recipeUuid').equals(recipeUuid).toArray();
  }
}
