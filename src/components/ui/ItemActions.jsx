import { Pencil1Icon, TrashIcon } from '@radix-ui/react-icons';
import { Button, Flex } from '@radix-ui/themes';

export function ItemActions({ item, onEdit, onDelete, direction = "row" }) {
  const handleEdit = (e) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(item);
    } else {
      console.warn('ItemActions: "onEdit" prop is not provided.');
    }
  }

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(item);
    } else {
      console.warn('ItemActions: "onDelete" prop is not provided.');
    }
  }

  return (
    <Flex direction={direction} gap="2" className="item-actions">
      {onEdit && (
        <Button
          variant="ghost"
          size="1"
          onClick={handleEdit}
          title="Modifier"
        >
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
    </Flex>
  );
};