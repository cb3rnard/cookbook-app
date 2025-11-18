import { Recipe } from '../../../models/entities/Recipe.js';
import { RecipeStore } from '../../../models/stores/RecipeStore.js';
import { fetchResizedImage } from '../../utils/fetchResizedImage.js';
import { BaseSyncRepository } from './BaseSyncRepository.js';

export class RecipeRepository extends BaseSyncRepository {
    static endpoint = 'recipes';
    static StoreClass = RecipeStore;
    static EntityClass = Recipe;

    async filter(filters = null, hydrateOptions = {}, fromSet = []) {
        try {
            const filteredEntities = await this.store.filter(filters, hydrateOptions, fromSet);

            const hydratedEntities = filteredEntities.map(async entity => await this._hydrate(entity, hydrateOptions));

            return Promise.all(hydratedEntities);
        } catch (error) {
            console.error(`Failed to filter Recipe entities:`, error);
            throw error;
        }
    }

    async save(entityData, update = false, synced = false) {
        const isNew = !entityData.uuid;
        try {
            const savedRecipe = await super.save(entityData, update, synced);
            // Sauvegarder les relations
            this.saveRelations(savedRecipe.uuid, entityData, isNew);

            return savedRecipe;
        } catch (error) {
            throw error;
        }
    }

    async saveRelations(recipeUuid, recipeData, isNew) {
        if (typeof (recipeData.ingredients) !== 'undefined') {
            await this.store.saveRecipeIngredients(recipeUuid, recipeData.ingredients, !isNew);
        }
        if (typeof (recipeData.types) !== 'undefined') {
            await this.store.saveRecipeTypes(recipeUuid, recipeData.types, !isNew);
        }
        if (typeof (recipeData.notes) === 'array') {
            await this.saveRecipeNotes(recipeUuid, recipeData.notes, true);
        }

        // Update partiel sans image → pas de changement
        if (typeof recipeData.imageUuid !== 'undefined' && typeof recipeData.imageUrl !== 'undefined' && typeof recipeData.image !== 'undefined') {
            await this.saveRecipeImage(recipeData, isNew);
        }
    }

    async saveRecipeNotes(recipeUuid, notes, deleteOld = true) {
        await this.store.deleteRecipeNotes(recipeUuid);
        const notesToSave = notes.map((note) => ({
            uuid: note.uuid || null,
            content: note.content || '',
            recipeUuid: recipeUuid,
            dateAdd: note.dateAdd || new Date().toISOString()
        }));
        if (notesToSave.length > 0) {
            return await this.repositories.notes.store.bulkPut(notesToSave);
        }
    }

    async saveRecipeImage(recipeData, isNew) {
        let newImage = null;
        const imageRepository = this.repositories.images;
        const recipeRepository = this.repositories.recipes;

        if (recipeData.imageUuid) {
            return;
        }

        if (recipeData.imageUrl) {
            try {
                const fetchedImageBlob = await fetchResizedImage(recipeData.imageUrl);
                newImage = new imageRepository.EntityClass({
                    blob: fetchedImageBlob,
                    mimeType: fetchedImageBlob.type,
                    size: fetchedImageBlob.size || 0,
                });
            } catch (error) {
                console.error(`Failed to fetch image from URL ${recipeData.imageUrl}:`, error);
            }
        } else if (recipeData.image) {
            newImage = recipeData.image;
        }

        // Comparer avec l'image actuelle
        const currentImage = isNew ? await this.getRecipeImage(entityData.uuid) : null;
        if (newImage && currentImage?.uuid !== newImage.uuid) {
            const savedImage = await imageRepository.save(newImage, false, false);
            // Mettre à jour la recette avec la nouvelle imageUuid
            await recipeRepository.save({
                uuid: recipeData.uuid,
                imageUuid: savedImage.uuid
            }, true);
            if (!isNew && currentImage) {
                // Supprimer l'ancienne image
                await imageRepository.delete(currentImage.uuid);
            }
        }
    }

    async getUsedDifficultyLevels() {
        return this.store.getUsedDifficultyLevels();
    }

    async getRecipeImage(recipeUuid) {
        try {
            const recipe = await this.get(recipeUuid, {}, false);
            if (!recipe.imageUuid) {
                return null;
            }
            return await this.repositories.images.get(recipe.imageUuid);
        } catch (error) {
            console.error(`Failed to get image for recipe ${recipeUuid}:`, error);
            throw error;
        }
    }

    async getRecipeIngredients(recipeUuid) {
        try {
            const recipeIngredients = await this.store.getRecipeIngredients(recipeUuid);

            if (recipeIngredients.length === 0) {
                return [];
            }

            const ingredientUuids = recipeIngredients.filter(recipeIngredient => recipeIngredient.ingredientUuid).map(recipeIngredient => recipeIngredient.ingredientUuid);

            const ingredients = await this.repositories.ingredients.getByUuids(ingredientUuids);

            recipeIngredients.map(recipeIngredient => {
                const relatedIngredient = ingredients.find(ing => ing && ing.uuid === recipeIngredient.ingredientUuid);

                return {
                    ...recipeIngredient,
                    name: relatedIngredient?.name || null
                };
            });
            return recipeIngredients;
        } catch (error) {
            console.error(`Failed to get recipe ingredients for ${recipeUuid}:`, error);
            throw error;
        }
    }

    async getRecipeTypes(recipeUuid) {
        try {
            const recipeTypes = await this.store.getRecipeTypes(recipeUuid);

            if (recipeTypes.length === 0) {
                return [];
            }

            const typesUuids = Array.from(new Set(recipeTypes.map(recipeType => recipeType.typeUuid)));
            const types = await this.repositories.types.getByUuids(typesUuids);

            return types.map((type) => {
                return {
                    typeUuid: type.uuid,
                    name: type.name || ''
                };
            });
        } catch (error) {
            console.error(`Failed to get recipe types for ${recipeUuid}:`, error);
            throw error;
        }
    }

    async getRecipeNotes(recipeUuid) {
        try {
            const notes = await this.repositories.notes.getNotesByRecipeUuid(recipeUuid);
            return notes;
        } catch (error) {
            console.error(`Failed to get notes for recipe ${recipeUuid}:`, error);
            throw error;
        }
    }

    async replaceRelatedEntityReference(oldUuid, newUuid, endpoint) {
        try {

            if (endpoint === 'ingredients') {
                await this.store.replaceRecipeIngredientReference(oldUuid, newUuid);
            } else if (endpoint === 'types') {
                await this.store.replaceRecipeTypeReference(oldUuid, newUuid);
            }
        } catch (error) {
            console.error(`Failed to replace related entity reference from ${oldUuid} to ${newUuid} for ${endpoint}:`, error);
            throw error;
        }
    }

    async _hydrate(recipeData, options = {}) {
        if ((options.withImage || options.withAll) && recipeData.imageUuid) {
            recipeData.image = await this.repositories.images.get(recipeData.imageUuid);
        }
        if (options.withIngredients || options.withAll) {
            recipeData.ingredients = await this.getRecipeIngredients(recipeData.uuid);
        }
        if (options.withTypes || options.withAll) {
            recipeData.types = await this.getRecipeTypes(recipeData.uuid);
        }
        if (options.withNotes || options.withAll) {
            recipeData.notes = await this.getRecipeNotes(recipeData.uuid);
        }

        return await super._hydrate(recipeData, options);
    }
}