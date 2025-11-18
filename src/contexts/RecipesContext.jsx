// contexts/RecipesContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { EventBus } from '../services/utils/EventBus';
import { useData } from './DataContext';

const RecipesContext = createContext();

export const RecipeProvider = ({ children }) => {
  const [recipes, setRecipes] = useState([]);
  const [filters, setFilters] = useState(null);
  const [hydrateOptions, setHydrateOptions] = useState({});
  const [needsRefresh, setNeedsRefresh] = useState(Date.now());
  const [eventBus] = useState(() => EventBus.getInstance());
  const { dataService } = useData();
  const repository = dataService.recipes;

  useEffect(() => {
    const refreshHandler = ({ entityType = null }) => {
      if (entityType === 'recipes') {
        setNeedsRefresh(Date.now());
      }
    };

    // Mise à jour des recettes chargées
    const savedHandler = ({ endpoint, entityData = null }) => {
      if (endpoint === 'recipes' && entityData) {
        const existingIndex = recipes.findIndex(r => r.uuid === entityData.uuid);
        let updatedRecipes = [];
        if (existingIndex !== -1) {
          // Mise à jour d'une recette existante
          updatedRecipes = [...recipes];
          // Assigner les nouvelles données
          updatedRecipes[existingIndex] = Object.assign(updatedRecipes[existingIndex], entityData);
        } else {
          // Ajout d'une nouvelle recette : comparer avec les filtres actuels
          const filteredRecipe = repository.filter(filters, {}, [entityData]);
          if (filteredRecipe.length !== 0) {
            updatedRecipes = [entityData, ...recipes];
          }
        }
        setRecipes(updatedRecipes);
      }
    }
    // eventBus.on('sync:updated', refreshHandler);
    eventBus.on('deleted', refreshHandler);
    eventBus.on('entity:saved', savedHandler);
    return () => {
      // eventBus.off('sync:updated', refreshHandler);
      eventBus.off('deleted', refreshHandler);
      eventBus.off('entity:saved', savedHandler);
    };
  }, [eventBus, recipes]);

  const getRecipe = async (uuid, hydrate = {}) => {
    try {
      const recipe = await repository.get(uuid, hydrate);
      return recipe;
    } catch (error) {
      console.error('Erreur lors de la récupération de la recette:', error);
      throw error;
    }
  }

  const getRecipes = async (filters, hydrate = {}) => {
    setHydrateOptions(hydrate);
    setFilters(filters);
    try {
      hydrate.construct = true;
      const allRecipes = await repository.filter(filters, hydrate);
      setRecipes(allRecipes);
    } catch (error) {
      console.error('Erreur lors de la récupération des recettes:', error);
      throw error;
    }
  };

  const saveRecipe = async (recipe) => {
    try {
      const savedRecipe = await repository.save(recipe);
      closeForm();
    } catch (error) {
    }
  }

  const deleteRecipe = async (recipe) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la recette "${recipe.name}" ?`)) {
      try {
        await repository.delete(recipe.uuid);
        setRecipes(recipes.filter(r => r.uuid !== recipe.uuid));
        // Attribue un timestamp pour forcer la mise à jour de l'état
        setNeedsRefresh(Date.now());

      } catch (error) {
      }
    }
  };

  /**
   * Retourne la classe CSS pour la difficulté
   */
  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase().trim()) {
      case 'easy': return 'green';
      case 'medium': return 'yellow';
      case 'hard': return 'red';
      default: return 'gray';
    }
  }

  const getDifficultyLabel = (difficulty) => {
    switch (difficulty?.toLowerCase().trim()) {
      case 'easy': return 'Facile';
      case 'medium': return 'Moyen';
      case 'hard': return 'Difficile';
      default: return '';
    }
  }

  return (
    <RecipesContext.Provider value={{
      // États
      recipes,
      needsRefresh,
      // Actions
      getRecipe,
      getRecipes,
      saveRecipe,
      deleteRecipe,
      setRecipes,
      setNeedsRefresh,
      getDifficultyColor,
      getDifficultyLabel
    }}>
      {children}
    </RecipesContext.Provider>
  );
};

export function useRecipes() {
  const context = useContext(RecipesContext);
  if (!context) {
    throw new Error('useRecipes must be used within RecipeProvider');
  }
  return context;
};