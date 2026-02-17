import { OptionsView } from '../layout/OptionsView';
import { LazyWrapper } from '../ui/LazyWrapper';

/**
 * Interface principale pour toutes les vues liées aux paramètres
 * Gère le routing interne et le lazy loading
 */
export const OptionsInterface = () => {
  // const { resetCurrentOverlayView } = useView();

  // const handleClose = () => {
  //   resetCurrentOverlayView();
  // };

  return (
    <LazyWrapper>
      <OptionsView />
    </LazyWrapper>
  );
};
