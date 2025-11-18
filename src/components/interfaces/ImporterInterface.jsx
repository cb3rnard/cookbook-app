import { CheckCircledIcon, CrossCircledIcon } from '@radix-ui/react-icons';
import { Box, Button, Flex, ScrollArea, Text } from '@radix-ui/themes';
import classNames from 'classnames';
import { Suspense, useMemo, useState } from 'react';
import { useData, useView } from '../../contexts';
import { useRecipes } from '../../contexts/RecipesContext';
import { RecipeForm } from '../forms/RecipeForm';
import { UrlImportForm } from '../forms/UrlImportForm';
import { RecipeView } from '../recipe/RecipeView';
import styles from './ImporterInterface.module.css';

export function ImporterInterface({ view }) {
  const [recipesData, setRecipesData] = useState(null);
  const { setCurrentOverlayView } = useView();
  const [editedIndex, setEditedIndex] = useState(null);
  const { setNeedsRefresh } = useRecipes();
  const { getRepository } = useData();
  const repository = useMemo(() => getRepository('recipes'), [getRepository]);

  const handleClose = () => {
    setCurrentOverlayView(null);
  };

  const handleReceive = (data) => {
    // Duplicate data x10 for testing
    // data = Array(10).fill(data).flat();
    setRecipesData(data);
  };

  const handleStartImport = () => {
    setCurrentOverlayView({
      type: 'import',
      mode: 'process',
      props: { recipesData },
      unstyledContent: true,
    });
  };

  const handleEdit = (editedIndex) => {
    setEditedIndex(editedIndex);
  };

  const handleImportRecipe = async (recipe, index = null) => {
    // Logique d'importation de la recette
    try {
      const savedEntity = await repository.save(recipe);
      setNeedsRefresh(Date.now());

      // Optionally show a success message or update UI
      if (index !== null) {
        setRecipesData((prevData) => {
          const newData = [...prevData];
          newData[index].imported = true; // Mark as imported
          return newData;
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'importation de la recette :', error);
      if (index !== null) {
        setRecipesData((prevData) => {
          const newData = [...prevData];
          newData[index].importError = true; // Mark as error
          return newData;
        });
      }
      // Optionally show an error message
    }
  };

  const renderView = () => {
    switch (view.mode) {
      case 'form':
        return (
          <Flex height="100%" align="center" justify="center" className={styles.interface}>
            <Box maxWidth="20rem" className={styles.urlForm}>
              <Flex direction="column" gap="2">
                {recipesData ? (
                  <Flex direction="column" gap="3">
                    <Text>{recipesData.length} recette(s) trouvées</Text>
                    <Button onClick={handleStartImport}>Importer</Button>
                  </Flex>
                ) : (
                  <UrlImportForm
                    onReceive={handleReceive}
                  />
                )}
                <Button variant="surface" onClick={() => setRecipesData(null)}>Annuler</Button>
              </Flex>
            </Box>
          </Flex>
        );

      case 'process':
        return (
          <Box p="3" height="100%" style={{ width: "100%" }} position="relative">
            <Flex direction="column" height="100%" gap="3" align="center" style={{ width: "100%" }}>
              <Flex gap="3" maxHeight="calc(100% - 6rem)" justify="center" style={{ maxWidth: '999999px' }} pb="6" position="relative">
                {recipesData.map((recipe, index) => (
                  <Box key={index} maxWidth={'40rem'} flexBasis={'28rem'} minWidth={{ initial: '18rem', sm: '20rem', md: '24rem' }} maxHeight="100%" className={styles.processContainer} position="relative" overflow="hidden">
                    {editedIndex === index ? (
                      <ScrollArea type="always" scrollbars="vertical" size="1" position="relative">
                        <Box>
                          <RecipeForm
                            recipeData={recipe}
                            onSave={(recipeData) => {
                              setRecipesData((prevData) => {
                                const newData = [...prevData];
                                newData[index] = recipeData;
                                console.log('Updated recipe data at index', index, recipeData);
                                return newData;
                              });
                              setEditedIndex(null);
                            }}
                            onClose={() => setEditedIndex(null)}
                            preventSave={true}
                          />
                        </Box>
                      </ScrollArea>
                    ) : (
                      <ScrollArea type="always" scrollbars="vertical" size="1" position="relative" >
                        <Flex direction="column" maxHeight={recipe} >
                          <RecipeView
                            recipeData={recipe}
                            withNotes={false}
                          />
                          <Flex gap="2" p="2" justify="center" className={styles.stickyFooter}>
                            <Button variant="surface" onClick={() => handleEdit(index)}>Éditer</Button>
                            <Button onClick={() => handleImportRecipe(recipe, index)}>Importer</Button>
                          </Flex>
                        </Flex>
                        {/* Overlay */}
                        {recipe.imported && (
                          <Box className={classNames(styles.overlay, styles.overlaySuccess)}>
                            <Text color="slate" size="5" weight="bold"><CheckCircledIcon size="3" /> Importée</Text>
                          </Box>
                        )}
                        {recipe.importError && (
                          <Box className={classNames(styles.overlay, styles.overlayError)}>
                            <Text size="5" color="red"><CrossCircledIcon size="3" /> Erreur d'importation</Text>
                            <Button variant="soft" size="2" onClick={() => setRecipesData((prevData) => {
                              const newData = [...prevData];
                              newData[index] = { ...newData[index], importError: null };
                              return newData;
                            })}>
                              Réessayer
                            </Button>
                          </Box>
                        )}
                      </ScrollArea>
                    )}
                  </Box>
                ))}
              </Flex>
              <Button onClick={handleClose} size="4">Terminer</Button>
            </Flex >
          </Box >
        );
    }
  };

  return (
    <Suspense fallback={<Box p="3">Chargement...</Box>}>
      {renderView()}
    </Suspense>
  );
};