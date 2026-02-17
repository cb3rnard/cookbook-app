import { CheckCircledIcon, CrossCircledIcon } from '@radix-ui/react-icons';
import { Box, Button, Flex, ScrollArea, Text } from '@radix-ui/themes';
import { useData } from '@src/contexts/DataContext';
import { useView } from '@src/contexts/ViewContext';
import { Recipe } from '@src/models/entities/Recipe';
import classNames from 'classnames';
import { Suspense, useCallback, useMemo, useState } from 'react';
import { RecipeForm } from '../forms/RecipeForm.jsx';
import { UrlImportForm } from '../forms/UrlImportForm';
import { RecipeView } from '../recipe/RecipeView';
import styles from './ImporterInterface.module.css';

export function ImporterInterface() {
  const [recipesData, setRecipesData] = useState<Recipe[]>([]);
  const { resetCurrentOverlayView } = useView();
  const [currentView, setCurrentView] = useState<'form' | 'process'>('form');
  const [editedIndex, setEditedIndex] = useState(0);
  const { getRepository } = useData();
  const [importedIndexes, setImportedIndexes] = useState<number[]>([]);
  const [errorIndexes, setErrorIndexes] = useState<number[]>([]);
  const repository = useMemo(() => getRepository('recipes'), [getRepository]);

  const handleClose = () => {
    resetCurrentOverlayView();
  };

  const handleReceive = (recipes: Recipe[]) => {
    // Duplicate data x10 for testing
    // data = Array(10).fill(data).flat();
    setRecipesData(recipes);
  };

  const handleStartImport = () => {
    setCurrentView('process');
  };

  const handleEdit = (editedIndex: number) => {
    setEditedIndex(editedIndex);
  };

  const handleImportRecipe = async (recipe: Recipe, index: number) => {
    try {
      await repository.save(recipe);
      setImportedIndexes((prev) => [...prev, index]);
    } catch (error) {
      console.error("Erreur lors de l'importation de la recette :", error);
      setErrorIndexes((prev) => [...prev, index]);
    }
  };

  // Recipe is unsaved to fill RecipeForm
  const handleSaveForm = (savedRecipe: Recipe, index: number) => {
    setRecipesData((prevData) => {
      const newData = [...prevData];
      newData[index] = savedRecipe;
      console.log('Updated recipe data at index', index, newData[index]);
      return newData;
    });
    setEditedIndex(0);
  };

  const handleResetError = (index: number) => {
    () => setErrorIndexes((prev) => prev.filter((i) => i !== index));
  };

  const isImported = (index: number) => {
    return importedIndexes.includes(index);
  };

  const hasError = (index: number) => {
    return errorIndexes.includes(index);
  };

  const View = useCallback(() => {
    switch (currentView) {
      case 'form':
        return (
          <Flex width="100%" height="100%" align="center" justify="center">
            <Box maxWidth="20rem" className={styles.urlForm}>
              <Flex direction="column" gap="2">
                {recipesData.length > 0 ? (
                  <Flex direction="column" gap="3">
                    <Text>{recipesData.length} recette(s) trouvées</Text>
                    <Button onClick={handleStartImport}>Importer</Button>
                  </Flex>
                ) : (
                  <UrlImportForm onReceive={handleReceive} />
                )}
                <Button variant="surface" onClick={() => setRecipesData([])}>
                  Annuler
                </Button>
              </Flex>
            </Box>
          </Flex>
        );

      case 'process':
        return (
          <Box
            p="3"
            height="100%"
            style={{ width: '100%' }}
            position="relative"
          >
            <Flex
              direction="column"
              height="100%"
              gap="3"
              align="center"
              style={{ width: '100%' }}
            >
              <Flex
                gap="3"
                maxHeight="calc(100% - 6rem)"
                justify="center"
                style={{ maxWidth: '999999px' }}
                pb="6"
                position="relative"
              >
                {recipesData.map((recipe, index) => (
                  <Box
                    key={index + 1}
                    maxWidth={'40rem'}
                    flexBasis={'28rem'}
                    minWidth={{ initial: '18rem', sm: '20rem', md: '24rem' }}
                    maxHeight="100%"
                    className={styles.processContainer}
                    position="relative"
                    overflow="hidden"
                  >
                    {editedIndex === index + 1 ? (
                      <ScrollArea type="always" scrollbars="vertical" size="1">
                        <Box>
                          <RecipeForm
                            recipeData={recipe}
                            onSave={(savedRecipe: Recipe) =>
                              handleSaveForm(savedRecipe, index)
                            }
                            onClose={() => setEditedIndex(0)}
                            preventSave={true}
                          />
                        </Box>
                      </ScrollArea>
                    ) : (
                      <ScrollArea type="always" scrollbars="vertical" size="1">
                        <Flex direction="column">
                          <RecipeView recipeData={recipe} withNotes={false} />
                          <Flex
                            gap="2"
                            p="2"
                            justify="center"
                            className={styles.stickyFooter}
                          >
                            <Button
                              variant="surface"
                              onClick={() => handleEdit(index)}
                            >
                              Éditer
                            </Button>
                            <Button
                              onClick={() => handleImportRecipe(recipe, index)}
                            >
                              Importer
                            </Button>
                          </Flex>
                        </Flex>
                        {/* Overlay */}
                        {isImported(index) && (
                          <Box
                            className={classNames(
                              styles.overlay,
                              styles.overlaySuccess,
                            )}
                          >
                            <Text color="gray" size="5" weight="bold">
                              <CheckCircledIcon /> Importée
                            </Text>
                          </Box>
                        )}
                        {hasError(index) && (
                          <Box
                            className={classNames(
                              styles.overlay,
                              styles.overlayError,
                            )}
                          >
                            <Text size="5" color="red" weight="bold">
                              <CrossCircledIcon /> Erreur d'importation
                            </Text>
                            <Button
                              variant="soft"
                              size="2"
                              onClick={() => handleResetError(index)}
                            >
                              Réessayer
                            </Button>
                          </Box>
                        )}
                      </ScrollArea>
                    )}
                  </Box>
                ))}
              </Flex>
              <Button onClick={handleClose} size="4">
                Terminer
              </Button>
            </Flex>
          </Box>
        );
      default:
        return <Box>Vue inconnue</Box>;
    }
  }, [currentView, recipesData, editedIndex]);

  return (
    <Suspense fallback={<Box p="3">Chargement...</Box>}>
      <View />
    </Suspense>
  );
}
