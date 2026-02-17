import { Pencil1Icon, ResetIcon, TrashIcon } from '@radix-ui/react-icons';
import { Button, Flex } from '@radix-ui/themes';

export interface ItemActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onRestore?: () => Promise<void>;
  direction?: 'row' | 'column';
}

export function ItemActions({
  onEdit,
  onDelete,
  onRestore,
  direction = 'row',
}: ItemActionsProps) {
  const handleEdit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onEdit?.();
  };

  const handleDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onDelete?.();
  };

  const handleRestore = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onRestore?.();
  };

  return (
    <Flex direction={direction} gap="2" className="item-actions">
      {onEdit && (
        <Button variant="ghost" size="1" onClick={handleEdit} title="Modifier">
          <Pencil1Icon />
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost"
          size="1"
          color="red"
          onClick={handleDelete}
          title="Supprimer"
        >
          <TrashIcon />
        </Button>
      )}
      {onRestore && (
        <Button
          variant="ghost"
          size="1"
          color="green"
          onClick={handleRestore}
          title="Restaurer"
        >
          <ResetIcon />
        </Button>
      )}
    </Flex>
  );
}
