import { TypeForm } from '@components/forms/TypeForm.jsx';
import { EntityTable } from '@components/ui/EntityTable.jsx';
import { Flex, Heading, Section, Select } from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import { useData } from '../../contexts/DataContext.jsx';
import { IngredientForm } from '../forms/IngredientForm.jsx';

const ENTITY_CONFIGS = {
  types: {
    name: 'Types',
    columns: [
      { key: 'uuid', label: 'ID', render: (entity) => entity.uuid },
      { key: 'name', label: 'Nom', render: (entity) => entity.name }
    ],
    renderEditForm: (uuid, onClose, onSave, onCancel) => (
      <TypeForm
        typeUuid={uuid}
        onClose={onClose}
        onSave={onSave}
        onCancel={onCancel}
      />
    )
  },
  ingredients: {
    name: 'Ingrédients',
    columns: [
      { key: 'uuid', label: 'UUID', render: (entity) => entity.uuid },
      { key: 'name', label: 'Nom', render: (entity) => entity.name },
      { key: 'type', label: 'Type', render: (entity) => entity.type }
    ],
    renderEditForm: (uuid, onClose, onSave, onCancel) => {
      return (
        <IngredientForm
          ingredientUuid={uuid}
          onClose={onClose}
          onSave={onSave}
          onCancel={onCancel}
        />
      );
    }
  },
  images: {
    name: 'Images',
    columns: [
      { key: 'uuid', label: 'UUID', render: (entity) => entity.uuid },
      { key: 'size', label: 'Poids', render: (entity) => entity.size },
      { key: 'mimeType', label: 'Type', render: (entity) => entity.mimeType }
    ],
    renderEditForm: null // Pas d'édition pour les images
  }
};

export function EntitiesSettings() {
  const [endpoint, setEndpoint] = useState('types');
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(false);
  const { getRepository } = useData();

  const currentConfig = ENTITY_CONFIGS[endpoint];

  const loadEntities = async () => {
    if (!currentConfig) return;

    setLoading(true);
    try {
      const loadedEntities = await getRepository(endpoint).getAll();
      setEntities(loadedEntities);
    } catch (error) {
      console.error(`Failed to load ${endpoint}:`, error);
      setEntities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (entity) => {
    // Recharger les entités après sauvegarde
    await loadEntities();
  };

  const handleDelete = async (entity) => {
    // Retirer l'entité de la liste locale
    setEntities(entities.filter(e => e.uuid !== entity.uuid));
  };

  const handleEntityTypeChange = (newEntityType) => {
    setEndpoint(newEntityType);
  };

  // Recharger les entités quand le type change
  useEffect(() => {
    loadEntities();
  }, [endpoint]);

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

        <div style={{ marginBottom: '1rem' }}>
          <Select.Root
            value={endpoint}
            onValueChange={handleEntityTypeChange}
          >
            <Select.Trigger
              style={{ width: '100%' }} />
            <Select.Content>
              {Object.entries(ENTITY_CONFIGS).map(([key, config]) => (
                <Select.Item key={key} value={key}>
                  {config.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>

        {loading ? (
          <p>Chargement...</p>
        ) : (
          <EntityTable
            endpoint={endpoint}
            entities={entities}
            columns={currentConfig.columns}
            renderEditForm={currentConfig.renderEditForm}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        )}
      </Flex>
    </Section>
  );
};