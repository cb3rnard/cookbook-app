import { TrashIcon } from '@radix-ui/react-icons';
import {
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Heading,
  Select,
  Separator,
  Switch,
  Text,
  TextArea,
  TextField,
} from '@radix-ui/themes';
import { config } from '@src/config/config.ts';
import { useApi } from '@src/contexts/ApiContext.js';
import { useData } from '@src/contexts/DataContext.tsx';
import { Recipe } from '@src/models/entities/Recipe.js';
import { EventBus } from '@src/services/utils/EventBus.ts';
import { getErrorMessage } from '@src/services/utils/GlobalUtils.js';
import {
  DifficultyLevels,
  ImageData,
  RecipeData,
  RecipeIngredientData,
} from '@src/types/entities.ts';
import { useEffect, useState } from 'react';
import { EntitySelect } from '../ui/EntitySelect.jsx';
import { LoadingWrapper } from '../ui/LoadingWrapper.tsx';
import { Notice } from '../ui/Notice.tsx';
import { EntityForm } from './EntityForm.tsx';
import { ImagePreviewField } from './fields/ImagePreviewField.jsx';
import styles from './RecipeForm.module.css';

export const RecipeForm = ({
  recipeUuid = '',
  recipeData,
  preventSave = false,
  onSave,
  onClose,
}: {
  recipeUuid?: string;
  recipeData?: Partial<RecipeData>;
  preventSave?: boolean;
  onSave?: (savedRecipe: Recipe) => void;
  onClose?: () => void;
}) => {
  const [recipe, setRecipe] = useState<Recipe>(() => {
    if (recipeData) {
      return new Recipe(recipeData);
    }
    return new Recipe();
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [syncingImage, setSyncingImage] = useState(false);
  const [imageSyncError, setImageSyncError] = useState<string | null>(null);
  const [eventBus] = useState(() => EventBus.getInstance());
  const { connection } = useApi();
  const { getRepository } = useData();
  const repository = getRepository('recipes');

  useEffect(() => {
    const fetchRecipe = async () => {
      setError(null);
      try {
        setIsLoading(true);
        const fetchedRecipe = await repository.get(recipeUuid, {
          withImage: true,
          withRecipeTypes: true,
          withRecipeIngredients: true,
        });
        if (fetchedRecipe) {
          setRecipe(fetchedRecipe);
        } else {
          setRecipe(new Recipe());
        }
        setIsLoading(false);
      } catch (error) {
        if (error instanceof Error) {
          setError(error);
        }
        setIsLoading(false);
        console.error('Erreur lors de la récupération de la recette:', error);
      }
    };
    if (recipeUuid) {
      fetchRecipe();
    }
  }, [recipeUuid, repository]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setRecipe((prev) => {
      const updated = prev.clone();
      if (name === 'name') updated.name = value;
      else if (name === 'description') updated.description = value;
      else if (name === 'timePreparation') {
        updated.timePreparation = parseInt(value) || 0;
      } else if (name === 'timeCook') {
        updated.timeCook = parseInt(value) || 0;
      } else if (name === 'portions') updated.portions = value;
      return updated;
    });
  };

  const handleIngredientChange = (
    index: number,
    field: keyof RecipeIngredientData,
    value: string | number,
  ) => {
    setRecipe((prev) => {
      const updated = prev.clone();
      updated.ingredients = updated.ingredients.map((ingredient, i) =>
        i === index ? { ...ingredient, [field]: value } : ingredient,
      );
      return updated;
    });
  };

  const addIngredient = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setRecipe((prev) => {
      const updated = prev.clone();
      updated.addIngredient();
      return updated;
    });
  };

  const removeIngredient = (index: number) => {
    setRecipe((prev) => {
      const updated = prev.clone();
      updated.removeIngredient(index);
      return updated;
    });
  };

  const handleStepChange = (index: number, value: string) => {
    setRecipe((prev) => {
      const updated = prev.clone();
      updated.steps = updated.steps.map((step, i) =>
        i === index ? value : step,
      );
      return updated;
    });
  };

  const addStep = () => {
    setRecipe((prev) => {
      const updated = prev.clone();
      updated.addStep();
      return updated;
    });
  };

  const removeStep = (index: number) => {
    setRecipe((prev) => {
      const updated = prev.clone();
      updated.removeStep(index);
      return updated;
    });
  };

  // Pre-save hook to filter empty ingredients
  const handlePreSave = async (entity: Recipe) => {
    const cleaned = entity.clone();
    cleaned.ingredients = cleaned.getValidIngredients();
    return cleaned;
  };

  const handleSave = async (savedEntity: Recipe) => {
    onSave?.(savedEntity);
  };

  const handleSyncMissingImage = async () => {
    if (!recipe.imageUuid || syncingImage) return;

    setSyncingImage(true);
    setImageSyncError(null);

    try {
      const syncedImage = await repository.retrieveRemoteImage(
        recipe.imageUuid,
      );

      if (syncedImage?.blob) {
        setRecipe((prev) => {
          const updated = prev.clone();
          updated.setImage(syncedImage);
          return updated;
        });
        setImageSyncError(null);

        // Émettre l'événement de synchronisation réussie
        eventBus.emit('image:synced', { image: syncedImage });
      } else {
        setImageSyncError('Image introuvable sur le serveur');
      }
    } catch (error) {
      console.error('Failed to sync image:', error);
      const errorMessage = getErrorMessage(
        error,
        'Erreur lors de la synchronisation',
      );
      setImageSyncError(errorMessage);
    } finally {
      setSyncingImage(false);
    }
  };

  const handleRemoveMissingImageUuid = () => {
    setRecipe((prev) => {
      const updated = prev.clone();
      updated.imageUuid = '';
      updated.setImage(null);
      return updated;
    });
    setImageSyncError(null);
  };

  return (
    <Box onClick={(e) => e.stopPropagation()}>
      <LoadingWrapper isLoading={isLoading} m="2">
        {error ? (
          <Notice
            type="error"
            title="Erreur lors du chargement de la recette."
            message={error.message}
          />
        ) : (
          <>
            <Flex justify="between" align="center" className={styles.header}>
              <Flex direction="column" gap="2">
                <Heading as="h1">
                  {recipeUuid
                    ? `Modifier la recette "${recipe.name}"`
                    : recipeData
                      ? `Éditer "${recipe.name || 'Recette importée'}"`
                      : 'Créer une nouvelle recette'}
                </Heading>
                {recipe.uuid && (
                  <Text as="div" size="1" color="gray">
                    #{recipe.uuid}
                  </Text>
                )}
              </Flex>
            </Flex>

            <EntityForm
              endpoint={config.ENDPOINTS_CONSTANTS.RECIPES}
              entity={recipe}
              preventSave={preventSave}
              onPreSave={handlePreSave}
              onSave={handleSave}
              onCancel={() => onClose?.()}
            >
              <Flex
                direction="column"
                gap="5"
                mb="4"
                p={{ initial: '2', xs: '4', sm: '6' }}
              >
                {/* UUID */}
                <input
                  type="text"
                  name="uuid"
                  value={recipe.uuid || ''}
                  hidden
                  readOnly
                />

                {/* IMAGE */}
                {recipe.imageUuid && (!recipe.image || !recipe.image.blob) ? (
                  <Card
                    variant="surface"
                    style={{ backgroundColor: 'var(--amber-3)' }}
                  >
                    <Flex direction="column" gap="3">
                      <Flex align="center" gap="2">
                        <Box style={{ fontSize: '2rem' }}>⚠️</Box>
                        <Flex direction="column" gap="1">
                          <Heading as="h4" size="3">
                            Image manquante
                          </Heading>
                          <Text size="2" color="gray">
                            Cette recette a une référence d&apos;image mais
                            l&apos;image n&apos;est pas disponible localement.
                          </Text>
                        </Flex>
                      </Flex>
                      {imageSyncError && (
                        <Text size="2" color="red">
                          {imageSyncError}
                        </Text>
                      )}
                      <Flex gap="2" wrap="wrap">
                        <Button
                          variant="soft"
                          onClick={handleSyncMissingImage}
                          disabled={
                            !connection.authenticated ||
                            !connection.online ||
                            syncingImage
                          }
                          title={
                            !connection.authenticated
                              ? 'Connexion requise pour synchroniser'
                              : !connection.online
                                ? 'Serveur indisponible'
                                : "Synchroniser l'image depuis le serveur"
                          }
                        >
                          {syncingImage
                            ? 'Synchronisation...'
                            : "Synchroniser l'image"}
                        </Button>
                        <Button
                          variant="soft"
                          color="red"
                          onClick={handleRemoveMissingImageUuid}
                        >
                          Supprimer la référence
                        </Button>
                      </Flex>
                      {!connection.authenticated && (
                        <Text size="1" color="gray">
                          Vous devez être authentifié pour synchroniser
                          l&apos;image.
                        </Text>
                      )}
                      {connection.authenticated && !connection.online && (
                        <Text size="1" color="gray">
                          Le serveur n&apos;est pas disponible.
                        </Text>
                      )}
                    </Flex>
                  </Card>
                ) : (
                  <ImagePreviewField
                    onUpload={(image: ImageData) => {
                      setRecipe((prev) => {
                        const updated = prev.clone();
                        updated.imageUuid = '';
                        updated.setImage(image);
                        return updated;
                      });
                    }}
                    onRemove={() => {
                      setRecipe((prev) => {
                        const updated = prev.clone();
                        updated.setImage(null);
                        updated.imageUuid = '';
                        return updated;
                      });
                    }}
                    image={recipe.image || null}
                    imageUrl={recipe.imageUrl || ''}
                  />
                )}

                <Box>
                  <Text as="label" htmlFor="name">
                    Nom de la recette *
                  </Text>
                  <TextField.Root
                    type="text"
                    id="name"
                    name="name"
                    value={recipe.name}
                    onChange={handleInputChange}
                    placeholder="Ex: Coq au vin"
                    required
                  />
                </Box>

                <Flex gap="6">
                  {/* TESTE */}
                  <Flex align="center" gap="2">
                    <Switch
                      id="tested"
                      name="tested"
                      checked={recipe.tested === 1}
                      onCheckedChange={(checked) => {
                        setRecipe((prev) => {
                          const updated = prev.clone();
                          updated.tested = checked ? 1 : 0;
                          return updated;
                        });
                      }}
                    ></Switch>
                    <Text as="label" htmlFor="tested">
                      Recette testée
                    </Text>
                  </Flex>
                  {/* FAVORI */}
                  <Flex align="center" gap="2">
                    <Switch
                      id="favorite"
                      name="favorite"
                      checked={recipe.favorite === 1}
                      onCheckedChange={(checked) => {
                        setRecipe((prev) => {
                          const updated = prev.clone();
                          updated.favorite = checked ? 1 : 0;
                          return updated;
                        });
                      }}
                    />
                    <Text as="label" htmlFor="favorite">
                      Recette favorite
                    </Text>
                  </Flex>
                </Flex>

                {/* DESCRIPTION */}
                <Box>
                  <Text as="label" htmlFor="description">
                    Description
                  </Text>
                  <TextArea
                    id="description"
                    name="description"
                    value={recipe.description}
                    onChange={handleInputChange}
                    placeholder="Décrivez votre recette..."
                    rows={3}
                    resize="vertical"
                  />
                </Box>

                {/* TEMPS PREPARATION & CUISSON */}
                <Flex gap="6">
                  <Box>
                    <Text as="label" htmlFor="timePreparation">
                      Temps de préparation (min)
                    </Text>
                    <TextField.Root
                      type="number"
                      id="timePreparation"
                      name="timePreparation"
                      value={recipe.timePreparation}
                      onChange={handleInputChange}
                      min="0"
                    />
                  </Box>
                  <Box>
                    <Text as="label" htmlFor="timeCook">
                      Temps de cuisson (min)
                    </Text>
                    <TextField.Root
                      type="number"
                      id="timeCook"
                      name="timeCook"
                      value={recipe.timeCook}
                      onChange={handleInputChange}
                      min="0"
                    />
                  </Box>
                </Flex>

                <Flex gap="6">
                  {/* PORTIONS */}
                  <Box>
                    <Text as="label" htmlFor="portions">
                      Portions
                    </Text>
                    <TextField.Root
                      id="portions"
                      name="portions"
                      value={recipe.portions}
                      onChange={handleInputChange}
                    />
                  </Box>
                  {/* DIFFICULTE */}
                  <Box>
                    <Text as="label" htmlFor="difficulty">
                      Difficulté
                    </Text>
                    <Select.Root
                      value={recipe.difficulty}
                      onValueChange={(value: string) => {
                        setRecipe((prev) => {
                          const updated = prev.clone();
                          updated.difficulty = value as DifficultyLevels;
                          return updated;
                        });
                      }}
                    >
                      <Select.Trigger style={{ width: '100%' }} />
                      <Select.Content>
                        <Select.Group>
                          <Select.Label>
                            Sélectionner la difficulté
                          </Select.Label>
                          <Select.Item value="easy">Facile</Select.Item>
                          <Select.Item value="medium">Moyen</Select.Item>
                          <Select.Item value="hard">Difficile</Select.Item>
                        </Select.Group>
                      </Select.Content>
                    </Select.Root>
                  </Box>
                </Flex>
                <Separator size="4" />

                {/* INGREDIENTS */}
                <Flex direction="column" gap="2">
                  <Heading as="h3" size="3">
                    Ingrédients *
                  </Heading>
                  <Grid
                    columns={{
                      initial: '1fr',
                      sm: 'repeat(auto-fill, minmax(320px, 1fr))',
                    }}
                    gap="4"
                  >
                    {(recipe.ingredients || []).map((ingredient, index) => (
                      <Card key={index}>
                        <Flex key={index} align="center" justify="end" gap="2">
                          <Flex gap="2" direction="column">
                            <Flex
                              gap="2"
                              align="center"
                              wrap={{ initial: 'wrap', xs: 'nowrap' }}
                            >
                              <Box asChild flexGrow="1" flexShrink="1">
                                <EntitySelect
                                  endpoint="ingredients"
                                  placeholder="Ingrédient"
                                  className={styles['ingredient-select']}
                                  selectedUuids={
                                    ingredient.ingredientUuid
                                      ? [ingredient.ingredientUuid]
                                      : []
                                  }
                                  isMulti={false}
                                  onChange={(uuids: string[]) => {
                                    const uuid =
                                      uuids.length > 0 ? uuids[0] : '';
                                    handleIngredientChange(
                                      index,
                                      'ingredientUuid',
                                      uuid,
                                    );
                                  }}
                                  labelProperty="name"
                                />
                              </Box>
                              <Box
                                asChild
                                flexGrow="1"
                                flexShrink="1"
                                flexBasis="auto"
                              >
                                <TextField.Root
                                  type="number"
                                  placeholder="Quantité"
                                  value={ingredient.quantity}
                                  onChange={(e) =>
                                    handleIngredientChange(
                                      index,
                                      'quantity',
                                      e.target.value,
                                    )
                                  }
                                />
                              </Box>
                              <Box
                                asChild
                                flexGrow="1"
                                flexShrink="1"
                                flexBasis="auto"
                              >
                                <TextField.Root
                                  type="text"
                                  placeholder="Unité"
                                  value={ingredient.unit}
                                  onChange={(e) =>
                                    handleIngredientChange(
                                      index,
                                      'unit',
                                      e.target.value,
                                    )
                                  }
                                />
                              </Box>
                            </Flex>
                            <TextField.Root
                              placeholder="Précisions (optionnel)"
                              value={ingredient.note}
                              onChange={(e) =>
                                handleIngredientChange(
                                  index,
                                  'note',
                                  e.target.value,
                                )
                              }
                            />
                          </Flex>
                          <Button
                            variant="ghost"
                            size="1"
                            color="red"
                            onClick={() => removeIngredient(index)}
                            title="Supprimer"
                          >
                            <TrashIcon />
                          </Button>
                        </Flex>
                      </Card>
                    ))}
                  </Grid>

                  <Flex justify="end">
                    <Button onClick={addIngredient}>
                      + Ajouter un ingrédient
                    </Button>
                  </Flex>
                </Flex>

                <Separator size="4" />

                {/* ETAPES */}
                <Flex direction="column" gap="2">
                  <Heading as="h3" size="4">
                    Étapes de préparation *
                  </Heading>
                  {(recipe.steps || []).map((step, index) => (
                    <Flex key={index} gap="2">
                      <Text as="span" className={styles['step-number']}>
                        {index + 1}
                      </Text>
                      <Box asChild flexGrow="1" flexShrink="1" flexBasis="auto">
                        <TextArea
                          placeholder="Décrivez cette étape..."
                          value={step}
                          onChange={(e) =>
                            handleStepChange(index, e.target.value)
                          }
                          required
                          rows={2}
                        />
                      </Box>
                      <Box asChild flexGrow="0" flexShrink="0" flexBasis="auto">
                        <Button onClick={() => removeStep(index)} color="red">
                          −
                        </Button>
                      </Box>
                    </Flex>
                  ))}
                  <Flex justify="end">
                    <Button onClick={addStep}>+ Ajouter une étape</Button>
                  </Flex>
                </Flex>

                <Separator size="4" />

                {/* TYPE DE RECETTE */}
                {recipe.types && (
                  <Box>
                    <Text as="label" htmlFor="type">
                      Type de recette
                    </Text>
                    <EntitySelect
                      endpoint="types"
                      placeholder="Sélectionner le(s) type(s)"
                      selectedUuids={recipe.types.map((type) => type.typeUuid)}
                      onChange={(uuids: string[]) => {
                        setRecipe((prev) => {
                          const updated = prev.clone();
                          updated.types = uuids.map((uuid: string) => ({
                            typeUuid: uuid,
                            name: '',
                          }));
                          return updated;
                        });
                      }}
                      labelProperty="name"
                      isMulti
                    />
                  </Box>
                )}
              </Flex>
            </EntityForm>
          </>
        )}
      </LoadingWrapper>
    </Box>
  );
};
