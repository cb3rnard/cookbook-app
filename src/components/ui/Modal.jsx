import { Dialog } from '@radix-ui/themes';

/**
 * Composant optimisé pour le rendu du contenu des modals
 * Évite les re-renders inutiles et préserve l'état des composants
 */
export function Modal({ id = null, align = null, title = '', description = '', buttons = [], onClose = null, children, ...props }) {
  return (
    <Dialog.Root
      key={id}
      open={true}
      onOpenChange={(open) => {
        if (!open) {
          onClose?.(id);
        }
      }}
      onClose={() => {
        onClose?.(id);
      }}
      size="2"
      modal={true}
      {...props}
    >
      <Dialog.Content align={align}>
        {title && (
          <Dialog.Title align={align}>{title}</Dialog.Title>
        )}
        {description && (
          <Dialog.Description align={align}>{description}</Dialog.Description>
        )}
        {children}
      </Dialog.Content>
    </Dialog.Root>
  );
};