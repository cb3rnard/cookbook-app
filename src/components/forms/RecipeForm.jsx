import { TrashIcon } from '@radix-ui/react-icons';
import { Box, Button, Card, Flex, Grid, Heading, Select, Separator, Switch, Text, TextArea, TextField } from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import { useRecipes } from '../../contexts';
import { Recipe } from '../../models/entities/Recipe';
import { EntitySelect } from '../ui/EntitySelect';
import { LoadingWrapper } from '../ui/LoadingWrapper';
import { Notice } from '../ui/Notice';
import { EntityForm } from './EntityForm';
import { ImagePreviewField } from './fields/ImagePreviewField';
import styles from './RecipeForm.module.css';

export const RecipeForm = ({ recipeUuid = null, recipeData = null, onSave = () => { }, onClose }) => {
  const [formData, setFormData] = useState(new Recipe());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { getRecipe } = useRecipes();

  useEffect(() => {
    const fetchRecipe = async () => {
      setError(null);
      try {
        setIsLoading(true);
        const fetchedRecipe = await getRecipe(recipeUuid, {
          construct: true,
          withImage: true,
          withTypes: true,
          withIngredients: true
        });
        setFormData(fetchedRecipe);
        setIsLoading(false);
      } catch (error) {
        setError(error);
        setIsLoading(false);
        console.error('Erreur lors de la récupération de la recette:', fallbackError);
      }
    };
    if (recipeUuid) {
      fetchRecipe();
    } else if (recipeData) {
      setFormData(new Recipe(recipeData));
    }
  }, [recipeUuid, recipeData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = prev.clone();
      updated[name] = value;
      return updated;
    });
  };

  const handleIngredientChange = (index, field, value) => {
    setFormData(prev => {
      const updated = prev.clone();
      const newIngredients = [...updated.ingredients];
      newIngredients[index][field] = value;
      updated.ingredients = newIngredients;
      return updated;
    });
  };

  const addIngredient = (e) => {
    e.preventDefault();
    setFormData(prev => {
      const updated = prev.clone();
      updated.ingredients = [...updated.ingredients, { ingredientUuid: null, name: '', quantity: 0, unit: '', note: '' }];
      return updated;
    });
  };

  const removeIngredient = (index) => {
    if (formData.ingredients.length > 1) {
      setFormData(prev => {
        const updated = prev.clone();
        updated.ingredients = updated.ingredients.filter((_, i) => i !== index);
        return updated;
      });
    }
  };

  const handleStepChange = (index, value) => {
    setFormData(prev => {
      const updated = prev.clone();
      const newSteps = [...updated.steps];
      newSteps[index] = value;
      updated.steps = newSteps;
      return updated;
    });
  };

  const addStep = () => {
    setFormData(prev => {
      const updated = prev.clone();
      updated.steps = [...updated.steps, ''];
      return updated;
    });
  };

  const removeStep = (index) => {
    if (formData.steps.length > 0) {
      setFormData(prev => {
        const updated = prev.clone();
        updated.steps = updated.steps.filter((_, i) => i !== index);
        return updated;
      });
    }
  };

  // Hook de pré-sauvegarde pour traiter les données avant sauvegarde
  const handlePreSave = async (formData) => {
    setFormData(prev => {
      const updated = prev.clone();
      updated.ingredients = formData.ingredients.filter(ing => (ing.ingredientUuid || ing.note)); // Filtrer les ingrédients sans UUID
      return updated;
    });
    return formData;
  };

  const handleSave = async (savedRecipe) => {
    onSave(savedRecipe);
  }

  return (
    <Box onClick={e => e.stopPropagation()}>
      <LoadingWrapper isLoading={isLoading} m="2">

        {error ? (
          <Notice type="error" title="Erreur lors du chargement de la recette." details={error.message} />
        ) : (
          <>
            <Flex justify="between" align="center" className={styles.header}>
              <Flex direction="column" gap="2">
                <Heading as="h1">
                  {recipeUuid ? `Modifier la recette "${formData.name}"` :
                    (recipeData ? `Éditer "${formData.name || 'Recette importée'}"` : 'Créer une nouvelle recette')}
                </Heading>
                {formData.uuid &&
                  <Text as="div" size="1" color="gray">
                    #{formData.uuid}
                  </Text>
                }
              </Flex>
            </Flex>

            <EntityForm
              endpoint="recipes"
              formData={formData}
              onPreSave={handlePreSave}
              onSave={handleSave}
              onCancel={onClose}
            >
              <Flex direction="column" gap="5" mb="4" p={{ initial: '2', xs: '4', sm: '6' }}>
                {/* UUID */}
                <input
                  type="text"
                  uuid="uuid"
                  name="uuid"
                  value={formData.uuid || ''}
                  hidden
                  readOnly
                />

                {/* IMAGE */}
                <ImagePreviewField
                  onUpload={(image) => {
                    setFormData(prev => {
                      const updated = prev.clone();
                      updated.imageUuid = null; // Set the image UUID
                      updated.image = image; // Set the uploaded image
                      return updated;
                    });
                  }}
                  onRemove={() => {
                    setFormData(prev => {
                      const updated = prev.clone();
                      updated.image = null; // Reset image
                      updated.imageUuid = null; // Reset imageUuid aussi
                      return updated;
                    });
                  }}
                  image={formData.image || null}
                  imageUrl={formData.imageUrl || null}
                />

                <Box>
                  <Text as="label" htmlFor="name">Nom de la recette *</Text>
                  <TextField.Root
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
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
                      checked={formData.tested}
                      onCheckedChange={(checked) => {
                        setFormData(prev => {
                          const updated = prev.clone();
                          updated.tested = checked;
                          return updated;
                        });
                      }}
                    >
                    </Switch>
                    <Text as="label" htmlFor="tested">
                      Recette testée
                    </Text>
                  </Flex>
                  {/* FAVORI */}
                  <Flex align="center" gap="2">
                    <Switch
                      id="favorite"
                      name="favorite"
                      checked={formData.favorite}
                      onCheckedChange={(checked) => {
                        ('Favorite changed to:', checked);
                        setFormData(prev => {
                          const updated = prev.clone();
                          updated.favorite = checked;
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
                  <Text as="label" htmlFor="description">Description</Text>
                  <TextArea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Décrivez votre recette..."
                    rows="3"
                    resize="vertical"
                  />
                </Box>

                {/* TEMPS PREPARATION & CUISSON */}
                <Flex gap="6">
                  <Box>
                    <Text as="label" htmlFor="timePreparation">Temps de préparation (min)</Text>
                    <TextField.Root
                      type="number"
                      id="timePreparation"
                      name="timePreparation"
                      value={formData.timePreparation}
                      onChange={handleInputChange}
                      min="0"
                    />
                  </Box>
                  <Box>
                    <Text as="label" htmlFor="timeCook">Temps de cuisson (min)</Text>
                    <TextField.Root
                      type="number"
                      id="timeCook"
                      name="timeCook"
                      value={formData.timeCook}
                      onChange={handleInputChange}
                      min="0"
                    />
                  </Box>
                </Flex>

                <Flex gap="6">
                  {/* PORTIONS */}
                  <Box>
                    <Text as="label" htmlFor="portions">Portions</Text>
                    <TextField.Root
                      id="portions"
                      name="portions"
                      value={formData.portions}
                      onChange={handleInputChange}
                    />
                  </Box>
                  {/* DIFFICULTE */}
                  <Box>
                    <Text as="label" htmlFor="difficulty">Difficulté</Text>
                    <Select.Root
                      id="difficulty"
                      name="difficulty"
                      value={formData.difficulty}
                      onValueChange={(value) => {
                        setFormData(prev => {
                          const updated = prev.clone();
                          updated.difficulty = value;
                          return updated;
                        });
                      }}
                      width="100%"
                    >
                      <Select.Trigger
                        style={{ width: '100%' }} />
                      <Select.Content>
                        <Select.Group>
                          <Select.Label>Sélectionner la difficulté</Select.Label>
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
                  <Heading as="h3" size="3">Ingrédients *</Heading>
                  <Grid columns={{ initial: "1fr", sm: "repeat(auto-fill, minmax(320px, 1fr))" }} gap="4">
                    {formData.ingredients.map((ingredient, index) => (
                      <Card key={index}>
                        <Flex key={index} align="center" justify="end" gap="2">
                          <Flex gap="2"
                            direction='column'>
                            <Flex gap="2" align="center" wrap={{ initial: 'wrap', xs: 'nowrap' }}>
                              <Box asChild flexGrow="1" flexShrink="1">
                                <EntitySelect
                                  endpoint="ingredients"
                                  placeholder="Ingrédient"
                                  className={styles['ingredient-select']}
                                  selectedUuids={ingredient.ingredientUuid ? [ingredient.ingredientUuid] : []}
                                  isMulti={false}
                                  onChange={(uuids) => {
                                    const uuid = uuids.length > 0 ? uuids[0] : '';
                                    handleIngredientChange(index, 'ingredientUuid', uuid);
                                    // On ne peut plus récupérer le nom directement, il faudrait une lookup
                                    // Pour l'instant on laisse le nom tel quel
                                  }}
                                />
                              </Box>
                              <Box asChild flexGrow="1" flexShrink="1" flexBasis="auto">
                                <TextField.Root
                                  type="number"
                                  placeholder="Quantité"
                                  value={ingredient.quantity}
                                  onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                                />
                              </Box>
                              <Box asChild flexGrow="1" flexShrink="1" flexBasis="auto">
                                <TextField.Root
                                  type="text"
                                  placeholder="Unité"
                                  value={ingredient.unit}
                                  onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                                />
                              </Box>
                            </Flex>
                            <TextField.Root
                              placeholder="Précisions (optionnel)"
                              value={ingredient.note}
                              onChange={(e) => handleIngredientChange(index, 'note', e.target.value)}
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
                  <Heading as="h3" size="4">Étapes de préparation *</Heading>
                  {formData.steps.map((step, index) => (
                    <Flex key={index} gap="2">
                      <Text as="span" className={styles['step-number']}>{index + 1}</Text>
                      <Box asChild flexGrow="1" flexShrink="1" flexBasis="auto">
                        <TextArea
                          placeholder="Décrivez cette étape..."
                          value={step}
                          onChange={(e) => handleStepChange(index, e.target.value)}
                          required
                          rows="2"
                        />
                      </Box>
                      <Box asChild flexGrow="0" flexShrink="0" flexBasis="auto">
                        <Button
                          onClick={() => removeStep(index)}
                          color="red"
                        >
                          −
                        </Button>
                      </Box>
                    </Flex>
                  ))}
                  <Flex justify="end">
                    <Button onClick={addStep}>
                      + Ajouter une étape
                    </Button>
                  </Flex>
                </Flex>

                <Separator size="4" />

                {/* TYPE DE RECETTE */}
                {formData.types &&
                  <Box>
                    <Text as="label" htmlFor="type">Type de recette</Text>
                    <EntitySelect
                      endpoint="types"
                      placeholder="Sélectionner le(s) type(s)"
                      selectedUuids={formData.types.map(type => type.typeUuid)}
                      onChange={(uuids) => {
                        setFormData(prev => {
                          const updated = prev.clone();
                          updated.types = uuids.map(uuid => ({
                            typeUuid: uuid,
                            name: '' // On ne peut plus récupérer le nom directement
                          }));
                          return updated;
                        });
                      }}
                      isMulti
                    />
                  </Box>
                }
              </Flex>
            </EntityForm>
          </>
        )}
      </LoadingWrapper>
    </Box >
  );
}

