import {
  EndpointRecipeRelationsDependencies,
  EndpointSyncable,
} from '@src/config/config.js';
import { Image } from '@src/models/entities/Image.js';
import {
  DifficultyLevels,
  ImageData,
  NoteData,
  RecipeData,
  RecipeIngredientData,
  RecipeTypeData,
} from '@src/types/entities.js';
import { RecipeFilters } from '@src/types/repositories';
import { HydrateOptions } from '@src/types/repositories.js';
import { RecipeStorage } from '@src/types/storage.js';
import { Recipe } from '../../../models/entities/Recipe.js';
import { RecipeTable } from '../../../models/tables/RecipeTable.js';
import { fetchResizedImage } from '../../utils/fetchResizedImage.js';
import { BaseSyncRepository } from './BaseSyncRepository.js';

export class RecipeRepository extends BaseSyncRepository<
  RecipeData,
  RecipeStorage,
  Recipe,
  RecipeTable
> {
  static _endpoint: EndpointSyncable = 'recipes';
  static _TableClass = RecipeTable;
  static _EntityClass = Recipe;

  async filter(
    filters: RecipeFilters,
    hydrateOptions: Partial<HydrateOptions> = {},
    fromSet = [],
  ) {
    const recipesData = await this.table.filter(filters, fromSet);

    const hydratedData = recipesData.map(
      async (entity) => await this._hydrate(entity, hydrateOptions),
    );

    return Promise.all(hydratedData);
  }

  async save(
    recipe: Recipe,
    skipValidation = false,
    synced = '',
    untouched = false,
    sync = true,
  ): Promise<void> {
    const isNew = !recipe.uuid;

    // Préparer l'image (alimente directement entity.imageUuid)
    const imageState = await this._prepareImageForSave(recipe);

    if (synced) {
      // If recipe was synced, save first and mark as dirty
      // It will be marked as synced after saving relations
      await super.save(recipe, skipValidation, 'presave', false, false);
    } else {
      await super.save(recipe, skipValidation, synced, untouched, sync);
    }

    await this._afterSaveOrUpdate(recipe, imageState, isNew, synced);

    // Émettre un événement custom avec la recette complète et ses relations
    this.eventBus.emit('recipe:savedWithRelations', {
      recipe: recipe,
      isNew,
    });
  }

  async update(
    recipe: Recipe,
    skipValidation = false,
    synced = '',
    sync = true,
  ): Promise<void> {
    const isNew = false;

    // Préparer l'image (alimente directement entity.imageUuid)
    const imageState = await this._prepareImageForSave(recipe);

    if (synced) {
      // If recipe was synced, update first and mark as dirty
      // It will be marked as synced after saving relations
      await super.update(recipe, skipValidation, '', false);
    } else {
      await super.update(recipe, skipValidation, synced, sync);
    }

    await this._afterSaveOrUpdate(recipe, imageState, isNew, synced);

    // Émettre un événement custom avec la recette complète et ses relations
    this.eventBus.emit('recipe:updatedWithRelations', {
      recipe: recipe,
    });
  }

  private async _afterSaveOrUpdate(
    recipe: Recipe,
    imageState: { imageUuidBefore: string; imageHasChanged: boolean },
    isNew = false,
    synced = '',
  ): Promise<Partial<RecipeData>> {
    let afterSaveData: Partial<RecipeData> = {};
    const relationsSaved = await this._saveRelations(recipe, imageState, isNew);
    if (relationsSaved && synced) {
      // If recipe was synced, mark as synced after successfully saving relations
      await super.synced(recipe, synced);
    }
    return afterSaveData;
  }

  /**
   * Prépare et valide les données d'image pour la sauvegarde
   * Détermine si l'image a changé, génère un nouvel UUID si nécessaire
   * Retourne l'état transitoire sans modifier directement la recette
   */
  /**
   * Prépare les données d'image pour la sauvegarde
   * Alimente directement entity.imageUuid si un nouvel UUID a été déterminé
   * @param entity - Entité Recipe à préparer
   * @returns État de l'image (imageUuidBefore et imageHasChanged) pour _saveRecipeImage
   */
  async _prepareImageForSave(
    entity: Recipe,
  ): Promise<{ imageUuidBefore: string; imageHasChanged: boolean }> {
    let newImageUuid = entity.imageUuid;
    let imageUuidBefore = '';
    let imageHasChanged = false;
    let hasImage = true;

    // Case 1: URL fournie → générer un nouveau UUID et marquer comme changé
    if (entity.imageUrl) {
      newImageUuid = crypto.randomUUID();
      imageHasChanged = true;
    }
    // Case 2: Image fournie directement (upload) → utiliser son UUID
    else if (entity.image?.uuid) {
      newImageUuid = entity.image.uuid;
    }
    // Case 4: Pas d'image
    else {
      hasImage = false;
    }

    // Pour les mises à jour : récupérer l'UUID actuel et comparer
    if (entity.uuid) {
      const currentRecipe = await this.get(entity.uuid, {}, false);
      imageUuidBefore = currentRecipe?.imageUuid || '';
    }

    // Détecter les changements
    if (hasImage && newImageUuid !== imageUuidBefore) {
      imageHasChanged = true;
    }

    // Alimenter directement entity.imageUuid si un nouvel UUID a été déterminé
    if (hasImage) {
      entity.imageUuid = newImageUuid;
    }

    return {
      imageUuidBefore,
      imageHasChanged,
    };
  }

  /**
   * Saves relations (ingredients, types, notes) and image after saving/updating a recipe
   */
  async _saveRelations(
    recipe: Recipe,
    imageState: { imageUuidBefore: string; imageHasChanged: boolean },
    isNew: boolean,
  ): Promise<boolean> {
    try {
      if (recipe.ingredients && recipe.ingredients.length > 0) {
        await this.table.saveRecipeIngredients(
          recipe.uuid,
          recipe.ingredients,
          !isNew,
        );
      }
      if (recipe.types && recipe.types.length > 0) {
        await this.table.saveRecipeTypes(recipe.uuid, recipe.types, !isNew);
      }
      if (recipe.notes && Array.isArray(recipe.notes)) {
        await this._saveRecipeNotes(recipe.uuid, recipe.notes);
      }

      // Sauvegarder l'image uniquement si elle a changé
      if (imageState.imageHasChanged) {
        try {
          await this._saveRecipeImage(recipe, imageState, isNew);
        } catch (error) {
          // Les erreurs d'image ne doivent plus bloquer la sauvegarde
          console.warn(
            `Failed to save image for recipe ${recipe.uuid}, will retry during hydration:`,
            error,
          );
          // On continue sans bloquer
        }
      }

      return true;
    } catch (error) {
      console.error(
        `Failed to save relations for recipe ${recipe.uuid}:`,
        error,
      );
      return false;
    }
  }

  async _saveRecipeNotes(recipeUuid: string, notes: NoteData[]) {
    await this.table.deleteRecipeNotes(recipeUuid);
    const notesToSave = notes.map((note) => ({
      content: note.content || '',
      recipeUuid: recipeUuid,
      dateAdd: note.dateAdd,
    }));
    if (notesToSave.length > 0) {
      return this.repositories.notes.saveBulk(notesToSave);
    }
  }

  async _saveRecipeImage(
    recipe: Recipe,
    imageState: {
      imageUuidBefore: string;
      imageHasChanged: boolean;
      imageUuid?: string;
    },
    isNew: boolean,
  ) {
    const newImageUuid = imageState.imageUuid ?? '';
    const imageUuidBefore = imageState.imageUuidBefore || '';
    const imageRepository = this.repositories.images;

    // Case 1 : Image deleted
    if (newImageUuid === '' && imageUuidBefore !== '') {
      await imageRepository.delete(imageUuidBefore);
      return;
    }

    let newImage: Image | null = null;

    // Case 2 : New image from URL
    const imageUrl = recipe.imageUrl;
    if (imageUrl) {
      const fetchedImageBlob = await fetchResizedImage(imageUrl);
      newImage = new Image({
        uuid: newImageUuid,
        blob: fetchedImageBlob,
        mimeType: fetchedImageBlob.type,
        size: fetchedImageBlob.size || 0,
      });
    }
    // Case 3 : Image provided directly (upload)
    else if (recipe.image) {
      // Si l'image a un blob, la sauvegarder directement
      if (recipe.image.blob) {
        newImage = new Image(recipe.image);
      }
      // Si l'image vient de l'API (sans blob), ne pas bloquer ici
      // La synchronisation sera tentée lors de l'hydratation
      else if (recipe.image['@type']) {
        // Do nothing here, hydration will handle the sync
        return;
      }
    }

    // Sauvegarder la nouvelle image si on en a une
    if (newImage && newImage.blob) {
      await imageRepository.save(newImage);
    }

    // Supprimer l'ancienne image si elle est différente
    if (!isNew && imageUuidBefore && imageUuidBefore !== newImageUuid) {
      try {
        await imageRepository.delete(imageUuidBefore);
      } catch (error) {
        console.warn(`Failed to delete old image ${imageUuidBefore}:`, error);
      }
    }
  }

  /**
   * Request an entity sync via EventBus
   * @private
   */
  async _requestImageSync(
    uuid: string,
  ): Promise<{ status: string; data?: ImageData | null }> {
    return new Promise((resolve) => {
      // Get image binary
      this.eventBus.emit('sync:request:imageBinary', {
        uuid,
        callback: resolve,
      });
    });
  }

  async getUsedDifficultyLevels(): Promise<DifficultyLevels[]> {
    return this.table.getUsedDifficultyLevels();
  }

  /**
   * Retrieves an image from the remote server and saves it locally
   * @param {string} imageUuid - UUID of the image to synchronize
   * @returns {Promise<Image|null>} The synchronized image or null if not found
   */
  async retrieveRemoteImage(imageUuid: string): Promise<ImageData | null> {
    if (!imageUuid) {
      return null;
    }

    if (!this.connectionStore.hasActiveSession) {
      console.warn('Cannot sync image: no active session');
      return null;
    }

    try {
      const syncResult = await this._requestImageSync(imageUuid);

      if (syncResult?.status === 'success' && syncResult.data?.blob) {
        const image = new Image(syncResult.data);
        // Synchronisation réussie : sauvegarder/mettre à jour l'image
        const imageRepository = this.repositories.images;
        await imageRepository.save(image);
        return syncResult.data;
      } else if (syncResult?.status === 'not_found') {
        // L'image n'existe pas sur le serveur
        console.warn(`Image ${imageUuid} not found on server`);
        return null;
      }

      return null;
    } catch (error) {
      console.error(`Failed to sync remote image ${imageUuid}:`, error);
      throw error;
    }
  }

  /**
   * Récupère une image, en local d'abord, puis depuis le serveur si nécessaire
   * @param {string} imageUuid - UUID de l'image
   * @param {boolean} sync - Tenter une synchronisation si l'image est manquante et canSync est activé
   * @returns {Promise<Image|null>} L'image ou null
   */
  async getImage(imageUuid = null, sync = false) {
    if (!imageUuid) {
      return null;
    }
    try {
      const localImage = await this.repositories.images.get(imageUuid);

      // Cas 1 : Image locale existe avec un blob valide
      if (localImage?.blob) {
        return localImage;
      }

      // Cas 2 : Image existe mais sans blob OU n'existe pas
      // Tenter une synchronisation si demandée et autorisée
      if (sync && this.canSync) {
        return this.retrieveRemoteImage(imageUuid);
      }

      // Cas 3 : Pas de sync ou sync impossible
      // Retourner l'image locale même sans blob (ou null si pas d'image)
      return localImage || null;
    } catch (error) {
      console.error(`Failed to get image ${imageUuid}:`, error);
      throw error;
    }
  }

  async getRecipeIngredients(
    recipeUuid: string,
    hydrateDependencies: '' | 'name' | 'full' = 'name',
  ): Promise<RecipeIngredientData[]> {
    const recipeIngredients = await this.table.getRecipeIngredients(recipeUuid);

    if (recipeIngredients.length === 0 || hydrateDependencies === '') {
      return recipeIngredients;
    }

    const ingredientUuids = recipeIngredients
      .filter((recipeIngredient) => recipeIngredient.ingredientUuid)
      .map((recipeIngredient) => recipeIngredient.ingredientUuid);

    const ingredients =
      await this.repositories.ingredients.getByUuids(ingredientUuids);

    const hydratedRecipeIngredients = recipeIngredients.map(
      (recipeIngredient) => {
        const relatedIngredient = ingredients.find(
          (ing) => ing && ing.uuid === recipeIngredient.ingredientUuid,
        );

        const ingredientName = recipeIngredient.ingredientUuid
          ? relatedIngredient?.name || '(ingrédient manquant)'
          : '';

        const result: RecipeIngredientData = {
          ...recipeIngredient,
          name: ingredientName,
        };

        // If hydrateDependencies is "full", include the full Ingredient entity
        if (hydrateDependencies === 'full' && relatedIngredient) {
          (result as any).ingredient = relatedIngredient;
        }

        return result;
      },
    );
    return hydratedRecipeIngredients;
  }

  async getRecipeTypes(
    recipeUuid: string,
    hydrateDependencies: '' | 'name' | 'full' = 'name',
  ): Promise<RecipeTypeData[]> {
    const recipeTypes = await this.table.getRecipeTypes(recipeUuid);

    if (recipeTypes.length === 0 || hydrateDependencies === '') {
      return recipeTypes;
    }

    const typesUuids = Array.from(
      new Set(recipeTypes.map((recipeType) => recipeType.typeUuid)),
    );
    const types = await this.repositories.types.getByUuids(typesUuids);
    const hydratedRecipeTypes = recipeTypes.map((recipeType) => {
      const relatedType = types.find(
        (type) => type && type.uuid === recipeType.typeUuid,
      );

      const typeName = recipeType.typeUuid
        ? relatedType?.name || '(type manquant)'
        : '';

      const result: RecipeTypeData = {
        ...recipeType,
        name: typeName,
      };

      // If hydrateDependencies is "full", include the full Type entity
      if (hydrateDependencies === 'full' && relatedType) {
        (result as any).type = relatedType;
      }

      return result;
    });
    return hydratedRecipeTypes;
  }

  async getRecipeNotes(recipeUuid: string): Promise<NoteData[]> {
    const notes =
      await this.repositories.notes.getNotesByRecipeUuid(recipeUuid);
    return notes;
  }

  // Replaces recipes relations entities and delete old entities (ingredients/types)
  async overwriteRecipesRelation(
    oldUuid: string,
    newUuid: string,
    endpoint: EndpointRecipeRelationsDependencies,
    hardDelete = false,
  ) {
    await this.repositories[endpoint].delete(oldUuid, '', hardDelete);
    const { replacedCount, relatedRecipesUuids } =
      await this.replaceRecipesRelation(
        oldUuid,
        newUuid,
        endpoint,
        !hardDelete,
      );
    return { replacedCount, relatedRecipesUuids };
  }

  async replaceRecipesRelation(
    oldUuid: string,
    newUuid: string,
    endpoint: EndpointRecipeRelationsDependencies,
    touch = false,
  ) {
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
  }

  async _hydrate(
    recipeData: (Partial<RecipeData> & { uuid: string }) | RecipeStorage,
    options: Partial<HydrateOptions> = {},
  ): Promise<Partial<RecipeData>> {
    const hydratedData: Partial<RecipeData> & { uuid: string } = {
      ...recipeData,
    };
    if ((options.withImage || options.complete) && recipeData.imageUuid) {
      hydratedData.image = await this._hydrateImage(recipeData.imageUuid);
    }

    // Determine dependency hydration level
    const hydrateDependencies = options.hydrateDependencies || '';

    if (options.withRecipeIngredients || options.complete) {
      hydratedData.ingredients = await this.getRecipeIngredients(
        recipeData.uuid,
        hydrateDependencies,
      );
    }
    if (options.withRecipeTypes || options.complete) {
      hydratedData.types = await this.getRecipeTypes(
        recipeData.uuid,
        hydrateDependencies,
      );
    }
    if (options.withNotes || options.complete) {
      hydratedData.notes = await this.getRecipeNotes(recipeData.uuid);
    }

    return super._hydrate(hydratedData, options);
  }

  /**
   * Hydrate l'image avec vérification et synchronisation automatique
   * Si l'image n'existe pas ou n'a pas de blob, tente une sync
   * Ne supprime jamais automatiquement l'imageUuid (géré par l'UI)
   */
  async _hydrateImage(imageUuid: string): Promise<ImageData | null> {
    if (!imageUuid) return null;

    const imageRepository = this.repositories.images;

    try {
      // D'abord vérifier si l'image existe localement avec un blob valide
      const localImage = await imageRepository.get(imageUuid);

      if (localImage?.blob) {
        return localImage;
      }

      // L'image n'existe pas localement ou n'a pas de blob
      // Tenter la synchronisation depuis le serveur si autorisée
      if (this.canSync) {
        const remoteImage = await this.retrieveRemoteImage(imageUuid);

        // Si l'image a été synchronisée avec succès, la retourner
        if (remoteImage?.blob) {
          return remoteImage;
        } else {
          // L'image n'a pas été trouvée sur le serveur
          // On garde la référence locale sans la supprimer automatiquement
          // L'utilisateur peut décider de la supprimer via l'UI (bouton "Supprimer la référence")
          return localImage || null;
        }
      }

      // Sync non autorisée ou pas de session active :
      // retourner l'image locale même sans blob (ou null)
      return localImage || null;
    } catch (error) {
      console.error(`Failed to hydrate image ${imageUuid}:`, error);
      return null;
    }
  }

  async removeImage(
    recipeUuid: string,
    imageUuid: string,
    deleteImage = false,
  ): Promise<void> {
    if (!imageUuid) {
      return;
    }
    const tempEntity = new Recipe({ uuid: recipeUuid, imageUuid: '' }, true);
    await super.update(tempEntity, true, '', true);
    if (deleteImage) {
      await this.repositories.images.delete(imageUuid, true);
    }
  }
}
