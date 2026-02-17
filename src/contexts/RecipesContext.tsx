// contexts/RecipesContext.jsx
import { Recipe } from '@src/models/entities/Recipe';
import { RecipeFilters } from '@src/types/repositories';
import { RecipesState } from '@src/types/states.js';
import { createContext, useContext, useMemo } from 'react';
import { useObservableState } from '../hooks/useObservableState';
import { RecipeStore } from '../services/stores/RecipeStore';
import { HydrateOptions } from '../types/repositories';
import { useData } from './DataContext';

export interface RecipesContext {
  recipes: Recipe[];
  filters: RecipeFilters | null;
  loading: boolean;
  getRecipes: (
    filters: RecipeFilters,
    hydrate?: Partial<HydrateOptions>,
  ) => Promise<void>;
  refreshRecipes: () => Promise<void>;
  deleteRecipe: (recipeUuid: string) => Promise<void>;
  restoreRecipe: (recipeUuid: string) => Promise<void>;
  getDifficultyColor: (difficulty: string) => string;
  getDifficultyLabel: (difficulty: string) => string;
}

const RecipesContext = createContext<RecipesContext | undefined>(undefined);

export interface RecipesProps {
  children: React.ReactNode;
}

export const RecipeProvider = ({ children }: RecipesProps) => {
  const { dataService } = useData();
  const repository = dataService.recipes;

  // Store singleton observable
  const recipeStore = useMemo(() => new RecipeStore(), []);
  const state = useObservableState<RecipesState>(recipeStore);

  /**
   * Charge les recettes depuis le repository et met à jour le store
   * Le Context orchestre : Repository fait la requête, Store stocke le résultat
   */
  const getRecipes = async (
    filters: RecipeFilters,
    hydrate: Partial<HydrateOptions> = {},
  ) => {
    try {
      recipeStore.setLoading(true);

      // Repository fait la requête DB
      const recipesData = await repository.filter(filters, hydrate);
      const recipes = recipesData.map((data) =>
        repository.constructEntity(data),
      );

      // Store stocke le résultat
      recipeStore.setRecipes(recipes, filters, hydrate);
    } catch (error) {
      console.error('Erreur lors de la récupération des recettes:', error);
      recipeStore.setLoading(false);
      throw error;
    }
  };

  /**
   * Rafraîchit les recettes avec les derniers filtres utilisés
   */
  const refreshRecipes = async () => {
    const { filters, hydrateOptions } = recipeStore.getCurrentQuery();
    if (filters) {
      await getRecipes(filters, hydrateOptions);
    }
  };

  /**
   * Supprime une recette
   * Le Repository fait la suppression, EventBus notifie le Store
   */
  const deleteRecipe = async (recipeUuid: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer cette recette ?`)) {
      try {
        await repository.delete(recipeUuid);
        // EventBus.emit('entity:deleted') sera automatiquement appelé
        // Le Store supprimera la recette de manière optimiste
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        throw error;
      }
    }
  };

  const restoreRecipe = async (recipeUuid: string) => {
    try {
      await repository.restore(recipeUuid);
    } catch (error) {
      console.error('Erreur lors de la restauration:', error);
      throw error;
    }
  };

  /**
   * Retourne la classe CSS pour la difficulté
   */
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase().trim()) {
      case 'easy':
        return 'green';
      case 'medium':
        return 'yellow';
      case 'hard':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty?.toLowerCase().trim()) {
      case 'easy':
        return 'Facile';
      case 'medium':
        return 'Moyen';
      case 'hard':
        return 'Difficile';
      default:
        return '';
    }
  };

  return (
    <RecipesContext.Provider
      value={{
        // États du Store
        recipes: state.recipes,
        filters: state.currentFilters,
        loading: state.loading,
        // Actions
        getRecipes,
        refreshRecipes,
        deleteRecipe,
        restoreRecipe,
        getDifficultyColor,
        getDifficultyLabel,
      }}
    >
      {children}
    </RecipesContext.Provider>
  );
};

export function useRecipes(): RecipesContext {
  const context = useContext(RecipesContext);
  if (!context) {
    throw new Error('useRecipes must be used within RecipeProvider');
  }
  return context;
}
