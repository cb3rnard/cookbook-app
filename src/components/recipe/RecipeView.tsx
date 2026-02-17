import { CheckIcon, HeartFilledIcon, HeartIcon } from '@radix-ui/react-icons';
import { Box, Button, Card, Em, Flex, Heading, Text } from '@radix-ui/themes';
import { useApi } from '@src/contexts/ApiContext';
import { useData } from '@src/contexts/DataContext';
import { useRecipes } from '@src/contexts/RecipesContext';
import { Recipe } from '@src/models/entities/Recipe';
import { ImageData, NoteData, RecipeData } from '@src/types/entities';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RecipeNoteForm } from '../forms/RecipeNoteForm.jsx';
import { LoadingWrapper } from '../ui/LoadingWrapper';
import { Notice } from '../ui/Notice';
import { Tag } from '../ui/Tag';
import { RecipeImageDisplay } from './RecipeImageDisplay';
import { RecipeNoteRow } from './RecipeNoteRow';
import styles from './RecipeView.module.css';

export function RecipeView({
  recipeUuid = '',
  recipeData = null,
  withNotes = true,
}: {
  recipeUuid?: string;
  recipeData?: RecipeData | null;
  withNotes?: boolean;
}) {
  const { session } = useApi();
  const [recipe, setRecipe] = useState(new Recipe());
  const [isNoteFormOpen, setIsNoteFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { getDifficultyColor, getDifficultyLabel } = useRecipes();
  const { getRepository } = useData();
  const repository = getRepository('recipes');

  useEffect(() => {
    // Sinon récupération recette existante depuis uuid
    const fetchRecipe = async () => {
      setError(null);
      try {
        setIsLoading(true);

        const fetchedRecipe = await repository.get(recipeUuid, {
          complete: true,
          hydrateDependencies: 'name',
        });
        if (!fetchedRecipe) {
          throw new Error('Recette non trouvée.');
        }

        setRecipe(fetchedRecipe);
        setIsLoading(false);
      } catch (fallbackError) {
        setRecipe(new Recipe());
        setIsLoading(false);
        setError(
          fallbackError instanceof Error
            ? fallbackError
            : new Error(String(fallbackError)),
        );
      }
    };
    if (recipeUuid) {
      fetchRecipe();
    } else if (recipeData) {
      setRecipe(new Recipe(recipeData));
    } else {
      setError(new Error('Aucune recette spécifiée.'));
    }
  }, [recipeUuid, recipeData]);

  const handleImageSynced = useCallback((syncedImage: ImageData) => {
    recipe.image = syncedImage;
  }, []);

  const handleDeleteNote = useCallback(
    (noteUuid: string) => {
      recipe.notes = recipe.notes.filter((note) => note.uuid !== noteUuid);
    },
    [recipe],
  );

  const handleSubmitNote = useCallback(
    (newNote: NoteData) => {
      recipe.notes = [...recipe.notes, newNote];
      setIsNoteFormOpen(false);
    },
    [recipe],
  );

  const handleImageRemoved = useCallback(() => {
    recipe.imageUuid = '';
    recipe.image = null;
  }, [recipe]);

  const syncDate = useMemo(() => {
    if (recipe.lastSyncDate) {
      return new Date(recipe.lastSyncDate).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return '';
  }, [recipe.lastSyncDate]);

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 60);
    const minutes = time % 60;
    return `${hours > 0 ? `${hours}h ` : ''}${minutes}min`;
  };

  const difficultyColor = useMemo(
    () => getDifficultyColor(recipe.difficulty),
    [recipe.difficulty],
  );
  const difficultyLabel = useMemo(
    () => getDifficultyLabel(recipe.difficulty),
    [recipe.difficulty],
  );

  return (
    <Box className={styles.view}>
      <LoadingWrapper isLoading={isLoading} m="2">
        {error ? (
          <Notice
            type="error"
            title="Erreur lors du chargement de la recette."
            message={error.message}
          />
        ) : (
          <>
            <header className={styles.header}>
              {/* COVER */}
              {(recipe.image || recipe.imageUuid || recipe.imageUrl) && (
                <div className={styles.banner}>
                  <RecipeImageDisplay
                    imageUuid={recipe.imageUuid || ''}
                    recipeUuid={recipe.uuid || ''}
                    image={recipe.image || null}
                    alt={recipe.name}
                    className={styles.image}
                    imageClassName={styles.image}
                    isCover={true}
                    onImageSynced={handleImageSynced}
                    onImageRemoved={handleImageRemoved}
                  />
                </div>
              )}
              {/* DIFFICULTY */}
              {difficultyLabel && (
                <Tag
                  className={styles.difficulty}
                  color={difficultyColor}
                  uppercase={true}
                >
                  {difficultyLabel}
                </Tag>
              )}
              {/* TITLE */}
              {recipe.name && (
                <Heading as="h2" size="5" className={styles.title}>
                  {recipe.name}
                </Heading>
              )}
            </header>
            <Flex direction="column" gap="8" p="4">
              <Flex direction="column" gap="2">
                {recipe.uuid && (
                  <Text as="p" size="1">
                    #{recipe.uuid}
                  </Text>
                )}
                {session.active && (
                  <Text as="p" size="1" color="gray">
                    {syncDate
                      ? `Dernière synchronisation : ${syncDate}`
                      : 'Jamais synchronisé'}
                  </Text>
                )}
              </Flex>
              {/* INTRO */}
              <Flex justify="between" gap="4" wrap="wrap">
                <Flex direction="column" gap="2" flexGrow="1" align="start">
                  {/* TYPES */}
                  {recipe.types && recipe.types.length > 0 && (
                    <Flex>
                      {recipe.types.map((type, index) => (
                        <Tag key={index}>{type.name}</Tag>
                      ))}
                    </Flex>
                  )}
                  <Flex gap="2" align="center">
                    {/* FAVORITE */}
                    <Tag
                      color={recipe.favorite ? 'red' : 'gray'}
                      rounded={true}
                    >
                      {recipe.favorite ? (
                        <HeartFilledIcon width="20" height="20" fill="red" />
                      ) : (
                        <HeartIcon width="20" height="20" fill="red" />
                      )}
                    </Tag>

                    {/* TESTED */}
                    {!!recipe.tested && (
                      <Tag color="green" rounded={true}>
                        <CheckIcon /> Recette testée
                      </Tag>
                    )}
                  </Flex>
                  {/* DESCRIPTION */}
                  {recipe.description && (
                    <Text as="p" className={styles.description}>
                      <Em>{recipe.description}</Em>
                    </Text>
                  )}
                </Flex>

                {/* META */}
                {recipe.totalTime > 0 || recipe.portions ? (
                  <Box className={styles.meta} minWidth="12rem">
                    {recipe.totalTime > 0 && (
                      <Flex direction="column">
                        <Flex gap="2" justify="between" wrap="wrap">
                          <Heading as="h3" size="3" className="label">
                            Durée:
                          </Heading>
                          <Text size="2">{formatTime(recipe.totalTime)}</Text>
                        </Flex>
                        {recipe.timePreparation > 0 && (
                          <Flex gap="2" justify="between" wrap="wrap">
                            <Heading as="h3" size="3" className="label">
                              Préparation:
                            </Heading>
                            <Text size="2">
                              {formatTime(recipe.timePreparation)}
                            </Text>
                          </Flex>
                        )}
                        {recipe.timeCook > 0 && (
                          <Flex gap="2" justify="between" wrap="wrap">
                            <Heading as="h3" size="3" className="label">
                              Cuisson:
                            </Heading>
                            <Text size="2">{formatTime(recipe.timeCook)}</Text>
                          </Flex>
                        )}
                      </Flex>
                    )}
                    {recipe.portions && (
                      <Flex gap="2" justify="between" wrap="wrap">
                        <Heading as="h3" size="3" className="label">
                          Portions:
                        </Heading>
                        <Text size="2">{recipe.portions}</Text>
                      </Flex>
                    )}
                  </Box>
                ) : null}
              </Flex>

              {/* INGREDIENTS */}
              {recipe.ingredients && recipe.ingredients.length > 0 && (
                <Flex direction="column" gap="2">
                  <Heading as="h3" size="3">
                    Ingrédients
                  </Heading>
                  <Box asChild>
                    <ul className={styles.ingredients}>
                      {recipe.ingredients.map((ingredient, index) => (
                        <Box asChild key={index}>
                          <li>
                            <Box asChild height="100%">
                              <Card size="1">
                                <Flex direction="column" gap="1">
                                  <Text weight="bold" size="4">
                                    {ingredient.name}
                                  </Text>
                                  <Text weight="medium">
                                    {ingredient.quantity > 0
                                      ? ingredient.quantity
                                      : ''}
                                    {ingredient?.unit || null}
                                  </Text>
                                </Flex>
                                {ingredient.note && (
                                  <Text size="2" color="gray">
                                    {ingredient.note}
                                  </Text>
                                )}
                              </Card>
                            </Box>
                          </li>
                        </Box>
                      ))}
                    </ul>
                  </Box>
                </Flex>
              )}

              {/* ETAPES */}
              {recipe.steps && recipe.steps.length > 0 && (
                <Flex direction="column" gap="2">
                  <Heading as="h3" size="3">
                    Étapes
                  </Heading>
                  <Box asChild>
                    <ol className={styles.steps}>
                      {recipe.steps.map((step, index) => (
                        <Box asChild key={index}>
                          <li className={styles.step}>
                            <Text>{step}</Text>
                          </li>
                        </Box>
                      ))}
                    </ol>
                  </Box>
                </Flex>
              )}
            </Flex>
            {/* FOOTER */}
            <Flex
              asChild
              className={styles.footer}
              direction="column"
              justify="between"
              gap="4"
              my="6"
              pt="6"
              px="4"
            >
              <footer>
                {withNotes && (
                  <Flex direction="column" gap="2">
                    <Heading as="h3">Notes</Heading>
                    {recipe.notes && recipe.notes.length > 0 ? (
                      <Flex direction="column" gap="4">
                        {recipe.notes.map((note, index) => (
                          <RecipeNoteRow
                            note={note}
                            key={index}
                            onDelete={handleDeleteNote}
                          />
                        ))}
                      </Flex>
                    ) : (
                      <Text as="p">Aucune note pour cette recette.</Text>
                    )}
                    <Box mt="4">
                      {isNoteFormOpen ? (
                        <RecipeNoteForm
                          recipeUuid={recipe.uuid}
                          onCancel={() => setIsNoteFormOpen(false)}
                          onSubmit={handleSubmitNote}
                        />
                      ) : (
                        <Button onClick={() => setIsNoteFormOpen(true)}>
                          Ajouter une note
                        </Button>
                      )}
                    </Box>
                  </Flex>
                )}
                <Text as="div" mt="4" align="right">
                  {recipe.dateAdd && (
                    <Text asChild className={styles.date}>
                      <time>
                        Recette ajoutée le{' '}
                        {new Date(recipe.dateAdd).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                        {recipe.dateModify &&
                          `, modifiée le ${new Date(
                            recipe.dateModify,
                          ).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}`}
                      </time>
                    </Text>
                  )}
                </Text>
              </footer>
            </Flex>
          </>
        )}
      </LoadingWrapper>
    </Box>
  );
}
