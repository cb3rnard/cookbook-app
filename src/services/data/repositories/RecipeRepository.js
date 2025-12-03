import { Recipe } from "../../../models/entities/Recipe.js";
import { RecipeTable } from "../../../models/tables/RecipeTable.js";
import { fetchResizedImage } from "../../utils/fetchResizedImage.js";
import { BaseSyncRepository } from "./BaseSyncRepository.js";

export class RecipeRepository extends BaseSyncRepository {
  static endpoint = "recipes";
  static TableClass = RecipeTable;
  static EntityClass = Recipe;

  async filter(filters = null, hydrateOptions = {}, fromSet = []) {
    try {
      const filteredEntities = await this.table.filter(
        filters,
        hydrateOptions,
        fromSet,
      );

      const hydratedEntities = filteredEntities.map(
        async (entity) => await this._hydrate(entity, hydrateOptions, false),
      );

      return Promise.all(hydratedEntities);
    } catch (error) {
      console.error(`Failed to filter Recipe entities:`, error);
      throw error;
    }
  }

  async save(entityData, update = false, synced = false, untouched = false) {
    const isNew = !entityData.uuid;
    try {
      let savedRecipe = null;

      const preparedRecipe = this._prepareForSave(entityData, isNew);
      // Set as unsynced before saving relations
      savedRecipe = await super.save(
        preparedRecipe,
        update,
        false,
        synced || untouched,
      );
      // Sauvegarder les relations
      const relationsSaved = await this._saveRelations(
        savedRecipe.uuid,
        preparedRecipe,
        isNew,
      );
      if (relationsSaved && synced) {
        return await super.save({ uuid: savedRecipe.uuid }, true, synced);
      }

      return savedRecipe;
    } catch (error) {}
  }

  _prepareForSave(entityData, isNew = false) {
    if (
      entityData.imageUuid === undefined &&
      entityData.image === undefined &&
      entityData.imageUrl === undefined
    ) {
      return { ...entityData };
    }
    let newImageUuid = entityData.imageUuid;
    let currentImageUuid = null;
    if (entityData.imageUrl) {
      newImageUuid = new Image().uuid;
    }
    if (entityData.image) {
      newImageUuid = entityData.image.uuid;
    }
    if (!isNew && newImageUuid !== undefined) {
      const currentRecipe = this.get(entityData.uuid, {}, false);
      currentImageUuid = currentRecipe?.imageUuid || null;
    }
    return { ...entityData, imageUuid: newImageUuid, currentImageUuid };
  }

  async _saveRelations(recipeUuid, recipeData, isNew) {
    try {
      if (typeof recipeData.ingredients !== "undefined") {
        await this.table.saveRecipeIngredients(
          recipeUuid,
          recipeData.ingredients,
          !isNew,
        );
      }
      if (typeof recipeData.types !== "undefined") {
        await this.table.saveRecipeTypes(recipeUuid, recipeData.types, !isNew);
      }
      if (typeof recipeData.notes === "array") {
        await this._saveRecipeNotes(recipeUuid, recipeData.notes, true);
      }

      // Save new recipe image if any data is provided
      await this._saveRecipeImage(recipeData, isNew);

      return true;
    } catch (error) {
      console.error(
        `Failed to save relations for recipe ${recipeUuid}:`,
        error,
      );
      return false;
    }
  }

  async _saveRecipeNotes(recipeUuid, notes, deleteOld = true) {
    await this.table.deleteRecipeNotes(recipeUuid);
    const notesToSave = notes.map((note) => ({
      uuid: note.uuid || null,
      content: note.content || "",
      recipeUuid: recipeUuid,
      dateAdd: note.dateAdd || new Date().toISOString(),
    }));
    if (notesToSave.length > 0) {
      return await this.repositories.notes.saveBulk(notesToSave);
    }
  }

  async _saveRecipeImage(recipeData, isNew) {
    const newImageUuid = recipeData.imageUuid;
    const currentImageUuid = recipeData.currentImageUuid;

    // If undefined, it's an update without image change
    if (
      newImageUuid === undefined ||
      (newImageUuid === null && currentImageUuid === null)
    ) {
      return;
    }
    const imageRepository = this.repositories.images;

    let newImage = null;

    if (recipeData.imageUrl) {
      try {
        const fetchedImageBlob = await fetchResizedImage(recipeData.imageUrl);
        newImage = new imageRepository.EntityClass({
          uuid: newImageUuid,
          blob: fetchedImageBlob,
          mimeType: fetchedImageBlob.type,
          size: fetchedImageBlob.size || 0,
        });
      } catch (error) {
        console.error(
          `Failed to fetch image from URL ${recipeData.imageUrl}:`,
          error,
        );
      }
    } else if (recipeData.image) {
      // If image has @context, it comes from API
      if (recipeData.image["@type"] && this.connectionStore.hasActiveSession) {
        const syncResult = await this._requestImageSync(newImageUuid);

        if (syncResult.status === "success") {
          newImage = syncResult.data;
        } else if (syncResult.status === "not_found") {
          // Image doesn't exist on server, remove it from recipe
          console.warn(
            `Image ${newImageUuid} not found on server, removing from recipe`,
          );
          newImage = null;
          // Update recipe to remove imageUuid reference
          if (!isNew) {
            await this.table.update(recipeData.uuid, { imageUuid: null });
          }
          return; // Exit early, no image to save
        } else {
          // Server error or network issue, keep current state and throw
          console.error(`Failed to fetch remote image: ${syncResult.error}`);
          throw new Error(`Image sync failed: ${syncResult.error}`);
        }
      } else {
        newImage = recipeData.image;
      }
    }

    if (newImage && currentImageUuid !== newImage.uuid) {
      await imageRepository.save(newImage, false, true);
    }

    if (!isNew && currentImageUuid && currentImageUuid !== newImageUuid) {
      // Delete previous image
      await imageRepository.delete(currentImageUuid);
    }
  }

  /**
   * Demande une sync d'entité via EventBus
   * @private
   */
  async _requestImageSync(uuid) {
    return new Promise((resolve) => {
      // Get image binary
      this.eventBus.emit("sync:request:imageBinary", {
        uuid,
        callback: resolve,
      });
    });
  }

  async getUsedDifficultyLevels() {
    return this.table.getUsedDifficultyLevels();
  }

  async getRecipeImage(imageUuid = null, sync = false) {
    if (!imageUuid) {
      return null;
    }
    try {
      const localImage = await this.repositories.images.get(imageUuid);

      if (localImage) {
        return localImage;
      } else if (this.connectionStore.hasActiveSession) {
        // If no local image found check if it exists remotely
        if (this.canSync && sync === true) {
          const remoteImage = await this._requestImageSync(imageUuid);
          return remoteImage;
        }
      } else {
        return null;
      }
    } catch (error) {
      console.error(`Failed to get image ${imageUuid}:`, error);
      throw error;
    }
  }

  async getRecipeIngredients(recipeUuid) {
    try {
      const recipeIngredients =
        await this.table.getRecipeIngredients(recipeUuid);

      if (recipeIngredients.length === 0) {
        return [];
      }

      const ingredientUuids = recipeIngredients
        .filter((recipeIngredient) => recipeIngredient.ingredientUuid)
        .map((recipeIngredient) => recipeIngredient.ingredientUuid);

      const ingredients =
        await this.repositories.ingredients.getByUuids(ingredientUuids);

      recipeIngredients.map((recipeIngredient) => {
        const relatedIngredient = ingredients.find(
          (ing) => ing && ing.uuid === recipeIngredient.ingredientUuid,
        );

        return {
          ...recipeIngredient,
          name: relatedIngredient?.name || null,
        };
      });
      return recipeIngredients;
    } catch (error) {
      console.error(
        `Failed to get recipe ingredients for ${recipeUuid}:`,
        error,
      );
      throw error;
    }
  }

  async getRecipeTypes(recipeUuid) {
    try {
      const recipeTypes = await this.table.getRecipeTypes(recipeUuid);

      if (recipeTypes.length === 0) {
        return [];
      }

      const typesUuids = Array.from(
        new Set(recipeTypes.map((recipeType) => recipeType.typeUuid)),
      );
      const types = await this.repositories.types.getByUuids(typesUuids);

      return types.map((type) => {
        return {
          typeUuid: type.uuid,
          name: type.name || "",
        };
      });
    } catch (error) {
      console.error(`Failed to get recipe types for ${recipeUuid}:`, error);
      throw error;
    }
  }

  async getRecipeNotes(recipeUuid) {
    try {
      const notes =
        await this.repositories.notes.getNotesByRecipeUuid(recipeUuid);
      return notes;
    } catch (error) {
      console.error(`Failed to get notes for recipe ${recipeUuid}:`, error);
      throw error;
    }
  }

  // Replaces recipes relations entities and delete old entities (ingredients/types)
  async overwriteRecipesRelation(
    oldUuid,
    newUuid,
    endpoint = "",
    hardDelete = false,
  ) {
    try {
      await this.repositories[endpoint].delete(oldUuid, false, hardDelete);
      const { replacedCount, relatedRecipesUuids } =
        await this.replaceRecipesRelation(
          oldUuid,
          newUuid,
          endpoint,
          !hardDelete,
        );
      return { replacedCount, relatedRecipesUuids };
    } catch (error) {
      console.error(
        `Failed to overwrite related entity reference from ${oldUuid} to ${newUuid} for ${endpoint}:`,
        error,
      );
      throw error;
    }
  }

  async replaceRecipesRelation(oldUuid, newUuid, endpoint = "", touch = false) {
    try {
      // Get uuids of recipes containing references to the old entity
      const { replacedCount, relatedRecipesUuids } =
        await this.table.replaceRecipesRelation(oldUuid, newUuid, endpoint);
      // Mark related recipes as dirty
      if (touch) {
        for (const recipeUuid of relatedRecipesUuids) {
          await this.touch(recipeUuid);
        }
      }
      return { replacedCount, relatedRecipesUuids };
    } catch (error) {
      console.error(
        `Failed to replace related entity reference from ${oldUuid} to ${newUuid} for ${endpoint}:`,
        error,
      );
      throw error;
    }
  }

  async _hydrate(recipeData, options = {}, sync = false) {
    if ((options.withImage || options.withAll) && recipeData.imageUuid) {
      recipeData.image = await this.getRecipeImage(recipeData.imageUuid, sync);
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
