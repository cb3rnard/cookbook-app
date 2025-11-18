import { CheckIcon, ClockIcon, HeartFilledIcon, HeartIcon, UpdateIcon } from '@radix-ui/react-icons';
import { Box, Flex, Heading, Text } from '@radix-ui/themes';
import { useCallback, useMemo } from 'react';
import { useApi } from '../../contexts/ApiContext';
import { useRecipes } from '../../contexts/RecipesContext';
import { useView } from '../../contexts/ViewContext';
import { ImageDisplay } from '../ui/ImageDisplay';
import { ItemActions } from '../ui/ItemActions';
import { Tag } from '../ui/Tag';
import styles from './RecipeCard.module.css';

export function RecipeCard({ recipe, ...props }) {
  const { connection } = useApi();
  const { hasActiveSession } = connection;
  const { openRecipeForm, openRecipeView } = useView();
  const {
    deleteRecipe,
    getDifficultyColor,
    getDifficultyLabel
  } = useRecipes();

  const handleEdit = async () => {
    if (recipe && recipe.uuid) {
      openRecipeForm(recipe.uuid);
    } else {
      console.warn('Recette invalide ou non spécifiée pour la modification');
    }
  };

  const handleDelete = async () => {
    if (recipe && recipe.uuid) {
      try {
        await deleteRecipe(recipe);
      } catch (error) {
        console.error('Erreur lors de la suppression de la recette:', error);
      }
    } else {
      console.warn('Recette invalide ou non spécifiée pour la suppression');
    }
  };

  const formatTime = useCallback((minutes) => {
    if (minutes === 0) return '';
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}min` : `${hours}h`;
  }, []);

  const date = useMemo(() => {
    if (recipe.dateModify && (recipe.dateModify !== recipe.dateAdd)) {
      return `${new Date(recipe.dateModify).toLocaleDateString('fr-FR')}`
    } else if (recipe.dateAdd) {
      return `${new Date(recipe.dateAdd).toLocaleDateString('fr-FR')}`;
    }
  }, [recipe.dateAdd, recipe.dateModify]);

  const difficultyColor = useMemo(() => getDifficultyColor(recipe.difficulty), [recipe.difficulty]);
  const difficultyLabel = useMemo(() => getDifficultyLabel(recipe.difficulty), [recipe.difficulty]);

  return (
    <Box as="article" className={`${styles.card} ${recipe.dateDeleted ? styles.deleted : ''}`} onClick={() => openRecipeView(recipe.uuid)} {...props}>
      <div className={styles.banner}>
        {recipe.image && (
          <div className={styles['image-container']}>
            <ImageDisplay
              image={recipe.image}
              alt={recipe.name}
              imageClassName={styles.image}
              isCover={true}
            />
          </div>
        )}
        <Flex className={styles['banner-inner']} align="start">
          <Flex justify="between" align="center" width="100%">
            <Flex gap="2" align="center">
              {(hasActiveSession && recipe.isDirty !== 0) && (
                <Tag color="red" rounded={true} title="Modifications non synchronisées">
                  <UpdateIcon size="1" />
                </Tag>
              )}
              {recipe.tested && (
                <Tag color="green" rounded={true} title="Recette testée">
                  <CheckIcon />
                </Tag>
              )}
            </Flex>
            {difficultyLabel && (
              <Tag color={difficultyColor} uppercase={true}>
                {difficultyLabel}
              </Tag>
            )}
          </Flex>
        </Flex>
      </div>

      <div className={styles.content}>
        <Flex as="header" gap="2" justify="between" align="start" mb="2">
          <div className={styles.heading}>
            <Heading as="h2" size="3">{recipe.name}</Heading>
          </div>
          <Tag color={recipe.favorite ? 'red' : 'gray'} rounded={true}>
            {recipe.favorite ? (
              <HeartFilledIcon width="20" height="20" fill="red" />
            ) : (
              <HeartIcon width="20" height="20" fill="red" />
            )}
          </Tag>
        </Flex>

        <Flex gap="4" mb="2" align="center">
          {recipe.totalTime > 0 && (
            <Flex align="center" gap="1">
              <ClockIcon /> <Text as="span" size="2">{formatTime(recipe.totalTime)}</Text>
            </Flex>
          )}
        </Flex>

        {recipe.tags && recipe.tags.length > 0 && (
          <Flex flexWrap="wrap" gap="2" mb="2">
            {recipe.tags.slice(0, 3).map((tag, index) => (
              <Tag key={index}>
                {tag}
              </Tag>
            ))}
            {recipe.tags.length > 3 && (
              <Tag color="gray" rounded={true}>
                +{recipe.tags.length - 3}
              </Tag>
            )}
          </Flex>
        )}

        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <div className={styles.ingredients}>
            <Heading as="h4" size="2">Ingrédients</Heading>
            <ul className="list-none">
              {recipe.ingredients.slice(0, 3).map((ingredient, index) => (
                <li key={index} className={styles.ingredient}>
                  {ingredient.quantity} {ingredient.unit} {ingredient.name}
                </li>
              ))}
              {recipe.ingredients.length > 3 && (
                <li className={styles.ingredient + ' ' + styles.more}>
                  +{recipe.ingredients.length - 3} autres...
                </li>
              )}
            </ul>
          </div>
        )}
        {recipe.types && recipe.types.length > 0 && (
          <Flex mt="auto" mb="2" gap="2" wrap="wrap">
            {recipe.types.map((type, index) => (
              <Tag key={index}>
                {type.name}
              </Tag>
            ))}
          </Flex>
        )}

        {(recipe.dateAdd || recipe.dateModify) && (
          <Flex as="footer" justify="between" gap="2" className={styles.footer}>
            <div className={styles.actions}>
              <ItemActions
                item={recipe}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </div>
            <time className={styles.date}>
              {date}
            </time>
          </Flex>
        )}
      </div>
    </Box>
  );
};
