import { useView } from '../contexts/ViewContext';
import { ImporterInterface } from './interfaces/ImporterInterface';
import { OptionsInterface } from './interfaces/OptionsInterface';
import { RecipeInterface } from './interfaces/RecipeInterface';
import { OverlayView } from './layout/OverlayView';

/**
 * Gestionnaire central pour toutes les overlay views
 * Route vers la bonne interface selon le type de vue
 */
export function OverlayManager() {
  const { currentOverlayView } = useView();

  if (!currentOverlayView.type) return;

  return (
    <OverlayView
      maxWidth={currentOverlayView.maxWidth}
      unstyledContent={currentOverlayView.unstyledContent || false}
      contentClassName={`overlay__${currentOverlayView.type} overlay__${currentOverlayView.type}--${currentOverlayView.mode || 'default'}`}
    >
      {currentOverlayView.type === 'recipe' && (
        <RecipeInterface view={currentOverlayView} />
      )}

      {currentOverlayView.type === 'settings' && <OptionsInterface />}

      {currentOverlayView.type === 'import' && <ImporterInterface />}
    </OverlayView>
  );
}
