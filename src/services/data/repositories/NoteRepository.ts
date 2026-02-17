import { Endpoint } from '@src/config/config.js';
import { NoteData } from '@src/types/entities.js';
import { NoteStorage } from '@src/types/storage.js';
import { Note } from '../../../models/entities/Note.js';
import { NoteTable } from '../../../models/tables/NoteTable.js';
import { BaseRepository } from './BaseRepository.js';

export class NoteRepository extends BaseRepository<
  NoteData,
  NoteStorage,
  Note,
  NoteTable
> {
  static _endpoint: Endpoint = 'notes';
  static _TableClass = NoteTable;
  static _EntityClass = Note;

  async getNotesByRecipeUuid(recipeUuid: string): Promise<NoteData[]> {
    return this.table.getNotesByRecipeUuid(recipeUuid);
  }

  async save(note: Note): Promise<void> {
    await super.save(note);
    const recipeRepository = this.repositories.recipes;
    await recipeRepository.touch(note.recipeUuid);
  }

  async delete(note: Note | string): Promise<void> {
    // Set related recipe as dirty
    this.repositories.recipes.touch(
      typeof note === 'string' ? note : note.recipeUuid,
    );
    await super.delete(note);
  }
}
