import { Dialog } from '@radix-ui/themes';
import { textAlignPropDef } from '@radix-ui/themes/props';
import { dialogContentPropDefs } from '@radix-ui/themes/src/components/dialog.props.tsx';

export interface ModalProps {
  id: string;
  dialogAlign?: (typeof dialogContentPropDefs.align.values)[number];
  titleAlign?: (typeof textAlignPropDef.align.values)[number];
  descriptionAlign?: (typeof textAlignPropDef.align.values)[number];
  title?: string;
  description?: string;
  buttons?: React.ReactNode[];
  onClose?: (id: string) => void;
  children: React.ReactNode;
}
/**
 * Composant optimisé pour le rendu du contenu des modals
 * Évite les re-renders inutiles et préserve l'état des composants
 */
export function Modal({
  id = '',
  dialogAlign,
  titleAlign,
  descriptionAlign,
  title = '',
  description = '',
  buttons = [],
  onClose,
  children,
  ...props
}: {
  id?: string;
  dialogAlign?: (typeof dialogContentPropDefs.align.values)[number];
  titleAlign?: (typeof textAlignPropDef.align.values)[number];
  descriptionAlign?: (typeof textAlignPropDef.align.values)[number];
  title?: string;
  description?: string;
  buttons?: React.ReactNode[];
  onClose?: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root
      key={id}
      open={true}
      onOpenChange={(open) => {
        if (!open) {
          onClose?.(id);
        }
      }}
      // modal={true}
      {...props}
    >
      <Dialog.Content align={dialogAlign}>
        {title && <Dialog.Title align={titleAlign}>{title}</Dialog.Title>}
        {description && (
          <Dialog.Description align={descriptionAlign}>
            {description}
          </Dialog.Description>
        )}
        {children}
      </Dialog.Content>
    </Dialog.Root>
  );
}
