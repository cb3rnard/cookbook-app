import { Box, Flex, Heading, Table } from '@radix-ui/themes';
import { Fragment, useMemo, useState } from 'react';

import { useData } from '../../contexts/DataContext.jsx';
import { ItemActions } from './ItemActions.jsx';

export function EntityTable({
  title,
  endpoint,
  entities,
  columns = [],
  renderEditForm = null,
  onSave = () => { },
  onDelete = () => { },
  showActions = true,
  deleteConfirmMessage = "Êtes-vous sûr de vouloir supprimer cet élément ?"
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editedEntityUuid, setEditedEntityUuid] = useState(null);
  const { getRepository } = useData();
  const repository = useMemo(() => getRepository(endpoint), [getRepository, endpoint]);

  const handleEdit = renderEditForm ? (entity) => {
    if (entity.uuid) {
      setEditedEntityUuid(entity.uuid);
      setIsFormOpen(true);
    }
  } : null;

  const handleDelete = async (entity) => {
    if (!entity.uuid) return;
    const confirmed = window.confirm(deleteConfirmMessage);
    if (confirmed) {
      try {
        await repository.delete(entity.uuid);
        onDelete(entity);
      } catch (error) {
        console.error('Failed to delete entity:', error);
      }
    }
  }

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditedEntityUuid(null);
  }

  const handleFormSave = (savedEntity) => {
    onSave(savedEntity);
    handleFormClose();
  }

  const editForm = useMemo(() => {
    if (!editedEntityUuid || !renderEditForm) return null;
    return renderEditForm(editedEntityUuid, handleFormClose, handleFormSave, handleFormClose);
  }, [editedEntityUuid]);

  // Colonnes par défaut si pas spécifiées
  const defaultColumns = [
    { key: 'uuid', label: 'ID', render: (entity) => entity.uuid },
    { key: 'name', label: 'Nom', render: (entity) => entity.name }
  ];

  const tableColumns = columns.length > 0 ? columns : defaultColumns;
  const totalColumns = tableColumns.length + (showActions ? 1 : 0);

  return (
    <Flex direction="column" gap="4">
      {title && (
        <Heading as="h3">
          {title}
        </Heading>
      )}
      <Table.Root>
        <Table.Header>
          <Table.Row>
            {tableColumns.map((column) => (
              <Table.ColumnHeaderCell key={column.key}>
                {column.label}
              </Table.ColumnHeaderCell>
            ))}
            {showActions && (
              <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
            )}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {entities.map((entity) => (
            <Fragment key={`${endpoint}-${entity.uuid}`}>
              <Table.Row>
                {tableColumns.map((column) => (
                  <Table.Cell key={`${entity.uuid}-${column.key}`}>
                    {column.render ? column.render(entity) : entity[column.key]}
                  </Table.Cell>
                ))}
                {showActions && (
                  <Table.Cell>
                    <ItemActions
                      item={entity}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  </Table.Cell>
                )}
              </Table.Row>
              {(isFormOpen && editedEntityUuid === entity.uuid && renderEditForm) && (
                <Table.Row key={`form-${entity.uuid}`}>
                  <Table.Cell colSpan={totalColumns}>
                    <Box pt={3}>
                      {editForm}
                    </Box>
                  </Table.Cell>
                </Table.Row>
              )}
            </Fragment>
          ))}
        </Table.Body>
      </Table.Root>
    </Flex>
  );
}