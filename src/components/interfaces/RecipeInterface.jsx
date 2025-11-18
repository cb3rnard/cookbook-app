import { ScrollArea } from '@radix-ui/themes';
import { useCallback } from 'react';
import { useView } from '../../contexts/ViewContext';
import { RecipeForm } from '../forms/RecipeForm';
import { RecipeView } from '../recipe/RecipeView';

/**
 * Interface principale pour toutes les vues liées aux recettes
 * Gère le routing interne et le lazy loading
 */
export const RecipeInterface = ({ view }) => {
  const { setCurrentOverlayView } = useView();

  const handleClose = () => {
    setCurrentOverlayView(null);
  };

  const View = useCallback(() => {
    switch (view.mode) {
      case 'edit':
        return (
          <RecipeForm
            recipeUuid={view.props?.recipeUuid}
            onClose={handleClose}
          />
        );

      case 'view':
        return (
          <ScrollArea type="vertical" style={{ height: '100%' }}>
            <RecipeView
              recipeUuid={view.props?.recipeUuid}
              onClose={handleClose}
            />
          </ScrollArea>
        );

      default:
        console.warn(`Mode de vue Recipe non supporté: ${view.mode}`);
        return <div>Vue non trouvée</div>;
    }
  }, [view]);

  return (
    <View />
  );
};
