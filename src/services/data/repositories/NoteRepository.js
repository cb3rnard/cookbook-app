import { Note } from '../../../models/entities/Note.js';
import { NoteStore } from '../../../models/stores/NoteStore.js';
import { BaseRepository } from './BaseRepository.js';

export class NoteRepository extends BaseRepository {
    static endpoint = 'notes';
    static StoreClass = NoteStore;
    static EntityClass = Note;

    async getNotesByRecipeUuid(recipeUuid) {
        try {
            return await this.store.getNotesByRecipeUuid(recipeUuid);
        } catch (error) {
            console.error(`Failed to get notes for recipe ${recipeUuid}:`, error);
            throw error;
        }
    }

    async save(noteData) {
        try {
            const recipeRepository = this.repositories.recipes;
            const savedNote = await this.store.save(noteData);
            await recipeRepository.update(noteData.recipeUuid);
            this.events.emit('note:saved', savedNote);
            return savedNote;
        } catch (error) {
            console.error('Erreur lors de la sauvegarde de la note :', error);
            throw error;
        }
    }

    async delete(noteUuid) {
        try {
            super.delete(noteUuid);
            const recipeRepository = this.repositories.recipes;
            await recipeRepository.touch(note.recipeUuid);
            this.events.emit('note:deleted', noteUuid);
            return noteUuid;
        } catch (error) {
            console.error('Erreur lors de la suppression de la note :', error);
            throw error;
        }
    }
}