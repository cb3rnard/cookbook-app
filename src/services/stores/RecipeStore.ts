import { Recipe } from '@src/models/entities/Recipe.ts';
import { RecipeData } from '@src/types/entities.ts';
import { HydrateOptions, RecipeFilters } from '@src/types/repositories.ts';
import { defaultRecipesState, RecipesState } from '@src/types/states.ts';
import { EventBus } from '../utils/EventBus.ts';
import { BaseStore } from './BaseStore.js';

/**
 * Store observable pour les recettes
 * Responsabilités :
 * - Stocker l'état des recettes actuellement affichées
 * - Écouter EventBus pour mises à jour optimistes
 * - Notifier les subscribers React via useSyncExternalStore
 */
export class RecipeStore extends BaseStore<RecipesState> {
  constructor() {
    super({ ...defaultRecipesState });
    this._setupEventListeners();
  }

  /**
   * Écoute les événements EventBus pour mises à jour optimistes
   * @private
   */
  _setupEventListeners() {
    const eventBus = EventBus.getInstance();

    // Mise à jour optimiste quand une recette est sauvegardée (données brutes du stockage)
    eventBus.on('entity:saved', ({ endpoint, entity }) => {
      if (endpoint === 'recipes' && entity?.uuid) {
        console.log('RecipeStore received entity:saved event', {
          endpoint,
          entity,
        });
        this._state.recipes.map((r) => (r.uuid === entity.uuid ? entity : r));
      }
    });

    // Mise à jour optimiste quand une recette est mise à jour (données brutes du stockage)
    eventBus.on('entity:updated', ({ endpoint, entityData }) => {
      if (endpoint === 'recipes' && entityData?.uuid) {
        console.log('RecipeStore received entity:updated event', {
          endpoint,
          entityData,
        });
        this.updateRecipeFromPartialData(
          entityData as Partial<RecipeData> & { uuid: string },
        );
      }
    });

    // Mise à jour avec relations complètes (depuis RecipeRepository)
    eventBus.on('recipe:savedWithRelations', ({ recipe, isNew }) => {
      if (recipe?.uuid) {
        console.log('RecipeStore received recipe:savedWithRelations event', {
          recipe,
          isNew,
        });
        if (isNew) {
          // Nouvelle recette : l'ajouter au début
          this.addRecipe(recipe);
        } else {
          // Recette existante : la mettre à jour
          this.updateRecipeEntity(recipe);
        }
      }
    });

    // Mise à jour avec relations complètes (depuis RecipeRepository)
    eventBus.on('recipe:updatedWithRelations', ({ recipe }) => {
      console.log('RecipeStore received recipe:updatedWithRelations event', {
        recipe,
      });
      if (recipe?.uuid) {
        this.updateRecipeEntity(recipe);
      }
    });

    // Suppression optimiste
    eventBus.on('entity:deleted', ({ endpoint, uuid }) => {
      if (endpoint === 'recipes' && uuid) {
        this.removeRecipe(uuid);
      }
    });

    // Synchronisation complète
    eventBus.on('entity:synced', ({ endpoint, uuid, lastSyncDate }) => {
      console.log('RecipeStore received entity:synced event', {
        endpoint,
        uuid,
        lastSyncDate,
      });
      if (endpoint === 'recipes' && uuid) {
        const existingRecipe = this.state.recipes.find((r) => r.uuid === uuid);
        if (existingRecipe) {
          // Créer une nouvelle entité avec les données mises à jour
          const updatedRecipe = new Recipe(existingRecipe.toData());
          updatedRecipe.isDirty = 0;
          updatedRecipe.lastSyncDate = lastSyncDate;
          this.updateRecipeEntity(updatedRecipe);
        }
      }
    });

    // Image synchronisée
    eventBus.on('image:synced', ({ image }) => {
      const updatedRecipes = this.state.recipes.map((recipe) => {
        if (recipe.imageUuid === image.uuid) {
          // Créer une nouvelle entité avec l'image mise à jour
          const updated = new Recipe(recipe.toData());
          updated.image = image;
          return updated;
        }
        return recipe;
      });
      if (updatedRecipes.some((r, i) => r !== this.state.recipes[i])) {
        this.setState({ recipes: updatedRecipes });
      }
    });

    eventBus.on('app:clear', () => {
      this.setState({ ...defaultRecipesState });
    });
  }

  /**
   * Définit la liste des recettes affichées
   * Appelé par le Context après récupération depuis le Repository
   */
  setRecipes(
    recipes: Recipe[],
    filters: RecipeFilters,
    hydrateOptions: Partial<HydrateOptions> = {},
  ) {
    this.setState({
      recipes,
      currentFilters: filters,
      currentHydrate: hydrateOptions,
      loading: false,
    });
  }

  /**
   * Définit l'état de chargement
   */
  setLoading(loading: boolean) {
    this.setState({ loading });
  }

  /**
   * Met à jour une recette existante avec des données partielles
   * Appelée quand un événement entity:saved/entity:updated est reçu
   * @param partialData - Données partielles du stockage (RecipeStorage)
   */
  updateRecipeFromPartialData(
    partialData: Partial<RecipeData> & { uuid: string },
  ) {
    const recipes = [...this.state.recipes];
    const index = recipes.findIndex((r) => r.uuid === partialData.uuid);

    if (index !== -1) {
      const existingRecipe = recipes[index];
      // Créer une nouvelle entité en fusionnant avec les données existantes
      const mergedData = { ...existingRecipe.toData(), ...partialData };
      const updatedRecipe = new Recipe(mergedData);

      // Si l'image existante a un blob et la nouvelle n'en a pas, conserver l'existante
      if (
        existingRecipe.image?.blob &&
        partialData.image &&
        !partialData.image.blob
      ) {
        updatedRecipe.image = existingRecipe.image;
      }

      recipes[index] = updatedRecipe;
      this.setState({ recipes });
    }
  }

  /**
   * Met à jour une recette existante avec une entité complète
   * Appelée après les mises à jour de sync
   * @param recipeEntity - Entité Recipe complète
   */
  updateRecipeEntity(recipeEntity: Recipe) {
    const recipes = [...this.state.recipes];
    const index = recipes.findIndex((r) => r.uuid === recipeEntity.uuid);

    if (index !== -1) {
      recipes[index] = recipeEntity;
      this.setState({ recipes });
    }
  }

  /**
   * Supprime une recette de la liste (optimiste)
   */
  removeRecipe(uuid: string) {
    this.setState({
      recipes: this.state.recipes.filter((r) => r.uuid !== uuid),
    });
  }

  /**
   * Ajoute une nouvelle recette au début de la liste (optimiste)
   * Utile quand une nouvelle recette est créée
   */
  addRecipe(recipe: Recipe) {
    const recipes = [recipe, ...this.state.recipes];
    this.setState({ recipes });
  }

  /**
   * Retourne les filtres et options actuels
   * Utile pour rafraîchir avec les mêmes paramètres
   */
  getCurrentQuery() {
    return {
      filters: this.state.currentFilters,
      hydrateOptions: this.state.currentHydrate,
    };
  }
}
