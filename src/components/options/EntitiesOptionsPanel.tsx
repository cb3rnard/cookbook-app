import { TypeForm } from '@components/forms/TypeForm.jsx';
import { EntityTable } from '@components/ui/EntityTable.jsx';
import {
  Box,
  Flex,
  Heading,
  Section,
  Select,
  Switch,
  Text,
} from '@radix-ui/themes';
import { config, Endpoint } from '@src/config/config.js';
import { useApi } from '@src/contexts/ApiContext.js';
import { Image } from '@src/models/entities/Image.js';
import { Ingredient } from '@src/models/entities/Ingredient.js';
import { Type } from '@src/models/entities/Type.js';
import { BaseSyncRepository } from '@src/services/data/repositories/BaseSyncRepository.js';
import { Entity, EntitySyncable } from '@src/types/entities.js';
import { Repository, SyncRepository } from '@src/types/repositories.js';
import { useEffect, useState } from 'react';
import { useData } from '../../contexts/DataContext.jsx';
import { IngredientForm } from '../forms/IngredientForm.jsx';

export interface EntityConfig<T extends Entity = Entity> {
  name: string;
  columns: {
    key: string;
    label: string;
    render: (entity: T) => React.ReactNode;
  }[];
  renderEditForm?:
    | ((
        entityUuid: string,
        onClose: () => void,
        onSave: (savedEntity: T) => void,
      ) => React.ReactNode)
    | null;
}

const ENTITY_CONFIGS: Record<string, EntityConfig<any>> = {
  types: {
    name: 'Types',
    columns: [
      { key: 'name', label: 'Nom', render: (entity: Type) => entity.name },
    ],
    renderEditForm: (
      entityUuid: string,
      onClose: () => void,
      onSave: (savedEntity: Type) => void,
    ) => <TypeForm typeUuid={entityUuid} onClose={onClose} onSave={onSave} />,
  },
  ingredients: {
    name: 'Ingrédients',
    columns: [
      {
        key: 'name',
        label: 'Nom',
        render: (entity: Ingredient) => entity.name,
      },
      {
        key: 'type',
        label: 'Type',
        render: (entity: Ingredient) => entity.type,
      },
    ],
    renderEditForm: (
      entityUuid: string,
      onClose: () => void,
      onSave: (savedEntity: Ingredient) => void,
    ) => {
      return (
        <IngredientForm
          ingredientUuid={entityUuid}
          onClose={onClose}
          onSave={onSave}
        />
      );
    },
  },
  images: {
    name: 'Images',
    columns: [
      {
        key: 'size',
        label: 'Poids',
        render: (entity: Image) => entity.size,
      },
      {
        key: 'mimeType',
        label: 'Type',
        render: (entity: Image) => entity.mimeType,
      },
    ],
    renderEditForm: null,
  },
};

export function EntitiesOptionsPanel() {
  const [endpoint, setEndpoint] = useState<Endpoint>('types');
  const [entities, setEntities] = useState<Entity[]>([]);
  const { session } = useApi();
  const [loading, setLoading] = useState(false);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [repository, setRepository] = useState<Repository | null>(null);
  const [isSyncable, setIsSyncable] = useState(false);
  const { getRepository } = useData();

  const currentConfig = { ...ENTITY_CONFIGS[endpoint] };

  useEffect(() => {
    if (
      session.active &&
      (config.ENDPOINTS_SYNCABLE as string[]).includes(endpoint) &&
      currentConfig.columns.findIndex((col) => col.key === 'synced') === -1
    ) {
      currentConfig.columns.unshift({
        key: 'synced',
        label: 'Sync.',
        render: (entity: EntitySyncable) =>
          entity.isDirty ? <span>❌</span> : <span>✅</span>,
      });
    }
  }, [session, endpoint, currentConfig.columns]);

  useEffect(() => {
    if (!endpoint) {
      setRepository(null);
      return;
    }
    const repo = getRepository(endpoint);
    setRepository(repo);
    setIsSyncable(repo instanceof BaseSyncRepository);
  }, [endpoint, getRepository]);

  const loadEntities = async () => {
    if (!currentConfig || !repository) return;

    setLoading(true);
    try {
      let loadedEntities = [];
      if (isSyncable) {
        loadedEntities = await (repository as SyncRepository).getAll(
          {},
          {},
          includeDeleted,
        );
      } else {
        loadedEntities = await repository.getAll();
      }
      setLoading(false);
      setEntities(loadedEntities);
    } catch (error) {
      console.error(`Failed to load ${endpoint}:`, error);
      setEntities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEntityTypeChange = (newEntityType: Endpoint) => {
    setEndpoint(newEntityType);
  };

  // Recharger les entités quand le type change
  useEffect(() => {
    loadEntities();
  }, [repository, includeDeleted]);

  if (!currentConfig) {
    return (
      <Section className="settings__panel">
        <Heading as="h2">Entités</Heading>
        <p>Configuration non trouvée pour le type d'entité sélectionné.</p>
      </Section>
    );
  }

  return (
    <Section className="settings__panel" asChild>
      <Flex direction="column" gap="4">
        <Heading as="h2">Gestion des entités</Heading>

        <Flex direction="column" gap="4" mb="4">
          <Select.Root value={endpoint} onValueChange={handleEntityTypeChange}>
            <Select.Trigger style={{ width: '100%' }} />
            <Select.Content>
              {Object.entries(ENTITY_CONFIGS).map(([key, config]) => (
                <Select.Item key={key} value={key}>
                  {config.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
          {isSyncable && (
            <Box>
              <Text as="label" className="label" htmlFor="includeDeleted">
                Inclure les entités supprimées
              </Text>
              <Flex align="center" gap="2">
                <Switch
                  id="includeDeleted"
                  size="2"
                  checked={includeDeleted}
                  onCheckedChange={(checked) => {
                    setIncludeDeleted(checked);
                  }}
                />
                <Text size="2">{includeDeleted ? 'Oui' : 'Non'}</Text>
              </Flex>
            </Box>
          )}
        </Flex>

        {loading ? (
          <p>Chargement...</p>
        ) : (
          <EntityTable
            endpoint={endpoint}
            entities={entities}
            columns={[...currentConfig.columns]}
            renderEditForm={currentConfig.renderEditForm}
          />
        )}
      </Flex>
    </Section>
  );
}
