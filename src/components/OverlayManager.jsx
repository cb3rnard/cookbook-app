import { useView } from '../contexts/ViewContext';
import { ImporterInterface } from './interfaces/ImporterInterface';
import { RecipeInterface } from './interfaces/RecipeInterface';
import { SettingsInterface } from './interfaces/SettingsInterface';
import { OverlayView } from './layout/OverlayView';

/**
 * Gestionnaire central pour toutes les overlay views
 * Route vers la bonne interface selon le type de vue
 */
export function OverlayManager() {
  const { currentOverlayView } = useView();

  if (!currentOverlayView) return null;

  return (
    <OverlayView maxWidth={currentOverlayView.maxWidth} unstyledContent={currentOverlayView.unstyledContent || false} contentClassName={`overlay__${currentOverlayView.type} overlay__${currentOverlayView.type}--${currentOverlayView.mode || 'default'}`}>

      {currentOverlayView.type === 'recipe' && <RecipeInterface view={currentOverlayView} />}

      {currentOverlayView.type === 'settings' && <SettingsInterface view={currentOverlayView} />}

      {currentOverlayView.type === 'import' && <ImporterInterface view={currentOverlayView} />}
    </OverlayView>
  );
};