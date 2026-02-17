import { Box, Flex, Heading, Table } from '@radix-ui/themes';
import { Fragment, useEffect, useMemo, useState } from 'react';

import { Endpoint } from '@src/config/config.js';
import { BaseSyncRepository } from '@src/services/data/repositories/BaseSyncRepository.js';
import { Entity, EntityData } from '@src/types/entities.js';
import {
  EndpointToEntity,
  Repository,
  SyncRepository,
} from '@src/types/repositories.js';
import { useData } from '../../contexts/DataContext.jsx';
import { ItemActions } from './ItemActions.js';

/**
 * Type guard : vérifie si un repository a la méthode restore (SyncRepository)
 */
function isSyncRepository(repo: Repository): repo is SyncRepository {
  return repo.constructor.prototype instanceof BaseSyncRepository;
}

interface EntityTableProps<TEndpoint extends Endpoint = Endpoint> {
  title?: string;
  endpoint: TEndpoint;
  entities: EndpointToEntity<TEndpoint>[];
  columns?: {
    key: string;
    label: string;
    render?: (entity: Entity) => React.ReactNode;
  }[];
  renderEditForm?:
    | ((
        entityUuid: string,
        onClose: () => void,
        onSave: (savedEntity: Entity) => void,
      ) => React.ReactNode)
    | null;
  showActions?: boolean;
  deleteConfirmMessage?: string;
}

export function EntityTable<TEndpoint extends Endpoint = Endpoint>({
  title,
  endpoint,
  entities,
  columns = [],
  renderEditForm,
  showActions = true,
  deleteConfirmMessage = 'Êtes-vous sûr de vouloir supprimer cet élément ?',
}: EntityTableProps<TEndpoint>) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editedEntityUuid, setEditedEntityUuid] = useState('');
  const { getRepository } = useData();
  const repository = useMemo(
    () => getRepository(endpoint),
    [getRepository, endpoint],
  );
  const [entitiesList, setEntitiesList] = useState<
    EndpointToEntity<TEndpoint>[]
  >(entities || []);

  const handleEdit = renderEditForm
    ? (entityUuid: string) => {
        if (entityUuid) {
          setEditedEntityUuid(entityUuid);
          setIsFormOpen(true);
        }
      }
    : undefined;

  const handleDelete = async (entityUuid: string) => {
    const entity = entityUuid
      ? entitiesList.find((e) => e.uuid === entityUuid)
      : null;
    if (!entity) return;
    const confirmed = window.confirm(deleteConfirmMessage);
    if (confirmed) {
      try {
        // TypeScript limitation: cannot guarantee endpoint/entity/repository alignment at compile time
        await (repository as any).delete(entity);
        if (!entity.hasOwnProperty('dateDeleted')) {
          // Hard delete
          setEntitiesList(entitiesList.filter((e) => e.uuid !== entityUuid));
        }
      } catch (error) {
        console.error('Failed to delete entity:', error);
      }
    }
  };

  const handleRestore = async (entityUuid: string) => {
    if (!entityUuid || !isSyncRepository(repository)) return;
    try {
      const entity = entitiesList.find((e) => e.uuid === entityUuid);
      if (!entity) return;
      await repository.restore(entity as any);
      console.log(`Entity ${entity.uuid} restored successfully.`);
    } catch (error) {
      console.error('Failed to restore entity:', error);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditedEntityUuid('');
  };

  const handleFormSave = () => {
    handleFormClose();
  };

  const editForm = useMemo(() => {
    if (!editedEntityUuid || !renderEditForm) return null;
    return renderEditForm(editedEntityUuid, handleFormClose, handleFormSave);
  }, [editedEntityUuid]);

  // Colonnes par défaut si pas spécifiées
  const uuidColumn = {
    key: 'uuid',
    label: 'ID',
    render: (entity: EntityData) => entity.uuid,
  };

  useEffect(() => {
    if (columns.find((col) => col.key === 'uuid')) return;
    columns.unshift(uuidColumn);
  }, []);

  const totalColumns = columns.length + (showActions ? 1 : 0);

  const isDeleted = (entity: EntityData) => {
    // If type of entity is EntitySyncableData, check dateDeleted
    if ('dateDeleted' in entity) {
      return !!entity.dateDeleted;
    }
    return false;
  };

  return (
    <Flex direction="column" gap="4">
      {title && <Heading as="h3">{title}</Heading>}
      <Table.Root>
        <Table.Header>
          <Table.Row>
            {columns.map((column) => (
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
          {entitiesList.map((entity) => (
            <Fragment key={`${endpoint}-${entity.uuid}`}>
              <Table.Row style={isDeleted(entity) ? { opacity: 0.5 } : {}}>
                {columns.map((column) => (
                  <Table.Cell key={`${entity.uuid}-${column.key}`}>
                    {column.render ? column.render(entity) : ''}
                  </Table.Cell>
                ))}
                {showActions && (
                  <Table.Cell>
                    <ItemActions
                      onEdit={
                        isDeleted(entity)
                          ? undefined
                          : () => handleEdit?.(entity.uuid || '')
                      }
                      onDelete={
                        isDeleted(entity)
                          ? undefined
                          : () => handleDelete(entity.uuid || '')
                      }
                      onRestore={
                        isDeleted(entity)
                          ? () => handleRestore(entity.uuid || '')
                          : undefined
                      }
                    />
                  </Table.Cell>
                )}
              </Table.Row>
              {isFormOpen &&
                editedEntityUuid === entity.uuid &&
                renderEditForm && (
                  <Table.Row key={`form-${entity.uuid}`}>
                    <Table.Cell colSpan={totalColumns}>
                      <Box pt={'3'}>{editForm}</Box>
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
