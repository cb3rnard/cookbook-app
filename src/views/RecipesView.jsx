import { Box, Flex } from "@radix-ui/themes";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar } from "../components/layout/Sidebar";
import { RecipeGrid } from "../components/recipe/RecipeGrid";
import { AppActions } from "../components/ui/AppActions";
import { useView } from "../contexts";
import { useRecipes } from "../contexts/RecipesContext";
import { useDebug } from "../hooks/useDebug";

export const RecipesView = (props) => {
  const { needsRefresh, recipes, getRecipes } = useRecipes();
  const [filters, setFilters] = useState({});
  const { uiState } = useView();
  const { sidebarOpen } = uiState;

  const [loading, setLoading] = useState(true);

  const { debug } = useDebug("component");

  // Load recipes
  useEffect(() => {
    const loadRecipes = async () => {
      setLoading(true);
      try {
        await getRecipes(filters, {
          withImage: true,
          withTypes: true,
          withIngredients: false,
          construct: true,
        });
      } catch (error) {
        console.error("Erreur lors de la récupération des recettes:", error);
      } finally {
        setLoading(false);
      }
    };

    if (needsRefresh) {
      debug("RecipesView detected needsRefresh, loading recipes", "recipes");
      loadRecipes();
    }
  }, [needsRefresh]);

  const handleFilterChange = async (newFilters) => {
    // Met à jour les filtres et récupère les recettes filtrées
    setFilters(newFilters);
    await getRecipes(newFilters, {
      withImage: true,
      withTypes: true,
      withIngredients: false,
      construct: true,
    });
  };

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some((filter) => filter.active);
  }, [filters]);

  const getEmptyMessage = useCallback(() => {
    if (hasActiveFilters) {
      return "Aucune recette ne correspond aux filtres";
    }
    return "Commencez par créer votre première recette !";
  });

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
          emptyMessage={getEmptyMessage()}
          flexGrow="1"
        />
      </Flex>

      <Box
        position="fixed"
        bottom="4"
        right="50%"
        style={{ transform: "translateX(50%)" }}
      >
        <AppActions />
      </Box>
    </Flex>
  );
};
