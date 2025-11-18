import { Type } from '../../../models/entities/Type.js';
import { TypeStore } from '../../../models/stores/TypeStore.js';
import { BaseSyncRepository } from './BaseSyncRepository.js';

export class TypeRepository extends BaseSyncRepository {
    static endpoint = 'types';
    static StoreClass = TypeStore;
    static EntityClass = Type;

    async getUsed() {
        try {
            return this.store.getUsed();
        } catch (error) {
            console.error('Erreur lors de la récupération des types utilisés:', error);
            throw error;
        }
    }

    async delete(typeUuid, synced = false) {
        try {
            const relatedRecipes = await this.store.getRelatedRecipesUuids(typeUuid);

            if (relatedRecipes && relatedRecipes.length > 0) {
                const recipeRepository = this.repositories.recipes;
                const recipesUuids = relatedRecipes;

                for (const recipeUuid of recipesUuids) {
                    await recipeRepository.update(recipeUuid, { typeUuids: null });
                }
            }

            // Supprimer le type et émettre l'événement
            await this.delete(typeUuid, synced);
            this.events.emit('type:deleted', typeUuid);

            return typeUuid;
        } catch (error) {
            console.error('Erreur lors de la suppression du type:', error);
            throw error;
        }
    }
}