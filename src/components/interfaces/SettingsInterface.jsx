import { useView } from '../../contexts/ViewContext';
import { Settings } from '../layout/Settings';
import { LazyWrapper } from '../ui/LazyWrapper';

/**
 * Interface principale pour toutes les vues liées aux paramètres
 * Gère le routing interne et le lazy loading
 */
export const SettingsInterface = ({ view }) => {
  const { setCurrentOverlayView } = useView();

  const handleClose = () => {
    setCurrentOverlayView(null);
  };

  return (
    <LazyWrapper >
      <Settings
        onClose={handleClose}
        {...(view.props || {})}
      />
    </LazyWrapper>
  );
};
