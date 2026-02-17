import { Box, Flex, FlexProps } from '@radix-ui/themes';
import { defaultRecipeFilters, RecipeFilters } from '@src/types/repositories';
import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { RecipeGrid } from '../components/recipe/RecipeGrid';
import { AppActions } from '../components/ui/AppActions';
import { useRecipes } from '../contexts/RecipesContext';
import { useView } from '../contexts/ViewContext';

export const RecipesView = (props: FlexProps) => {
  const { recipes, getRecipes } = useRecipes();
  const [filters, setFilters] = useState({ ...defaultRecipeFilters });
  const { uiState } = useView();
  const { sidebarOpen } = uiState;

  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  // Load recipes on mount
  useEffect(() => {
    const loadRecipes = async () => {
      setLoading(true);
      try {
        await getRecipes(filters, {
          withImage: true,
          withRecipeTypes: true,
          hydrateDependencies: 'name',
          withRecipeIngredients: false,
        });
      } catch (error) {
        console.error('Erreur lors de la récupération des recettes:', error);
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };

    if (initialLoad) {
      loadRecipes();
    }
  }, [initialLoad]);

  const handleFilterChange = async (newFilters: RecipeFilters) => {
    // Met à jour les filtres et récupère les recettes filtrées
    setFilters(newFilters);
    await getRecipes(newFilters, {
      withImage: true,
      withRecipeTypes: true,
      withRecipeIngredients: false,
    });
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== '' ||
      (filters.ingredients && filters.ingredients.length > 0) ||
      (filters.types && filters.types.length > 0) ||
      (filters.difficulties && filters.difficulties.length > 0) ||
      filters.deleted
    );
  }, [filters]);

  const emptyMessage = useMemo(() => {
    if (hasActiveFilters) {
      return 'Aucune recette ne correspond aux filtres';
    }
    return 'Commencez par créer votre première recette !';
  }, [hasActiveFilters]);

  return (
    <Flex {...props}>
      <Sidebar
        filters={filters}
        onFilterChange={handleFilterChange}
        isOpen={sidebarOpen}
      />

      <Flex direction="column" p="6" overflow="auto" flexGrow="1">
        <RecipeGrid
          recipes={recipes}
          loading={loading}
          emptyMessage={emptyMessage}
          flexGrow="1"
        />
      </Flex>

      <Box
        position="fixed"
        bottom="4"
        right="50%"
        style={{ transform: 'translateX(50%)' }}
      >
        <AppActions />
      </Box>
    </Flex>
  );
};
