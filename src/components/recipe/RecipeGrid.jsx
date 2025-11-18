import { Box, Flex, Heading, Text } from '@radix-ui/themes';
import { RecipeCard } from './RecipeCard';
import styles from './RecipeGrid.module.css';

export function RecipeGrid({
  recipes = [],
  loading = false,
  emptyMessage = "Aucune recette trouvée",
  ...props
}) {

  if (loading) {
    return (
      <Flex direction="column" align="center" justify="center" p="8" className={styles.loading} {...props}>
        <Box className={styles.loadingSpinner}>
          <Box className={styles.loadingDot}></Box>
          <Box className={styles.loadingDot}></Box>
          <Box className={styles.loadingDot}></Box>
        </Box>
        <Text size="3" weight="bold" color="accent">Chargement des recettes...</Text>
      </Flex>
    );
  }

  if (recipes.length === 0) {
    return (
      <Flex direction="column" align="center"  className={styles.empty} {...props}>
        <Box className={styles.emptyState}>
          <Box className={styles.emptyIcon}>🍽️</Box>
          <Heading className={styles.emptyTitle}>Aucune recette</Heading>
          <Text className={styles.emptyDescription}>{emptyMessage}</Text>
        </Box>
      </Flex>
    );
  }

  return (
    <Box className={styles.grid} {...props}>
      <Box className={styles.header}>
        <Heading className={styles.title}>
          {recipes.length} recette{recipes.length > 1 ? 's' : ''}
        </Heading>
      </Box>

      <Box className={styles.container}>
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe?.uuid}
            recipe={recipe}
          />
        ))}
      </Box>
    </Box>
  );
};