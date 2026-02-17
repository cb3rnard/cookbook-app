import { TextField } from '@radix-ui/themes';
import { config } from '@src/config/config';
import { useData } from '@src/contexts/DataContext';
import { Type } from '@src/models/entities/Type';
import { useEffect, useMemo, useState } from 'react';
import { EntitySelect } from '../ui/EntitySelect';
import { EntityForm } from './EntityForm';

export function TypeForm({
  typeUuid = '',
  onSave,
  onClose,
}: {
  typeUuid?: string;
  onSave?: (savedType: Type) => void;
  onClose?: () => void;
}) {
  const [type, setType] = useState<Type>(() => new Type());
  const { getRepository } = useData();
  const repository = useMemo(() => getRepository('types'), [getRepository]);

  useEffect(() => {
    const loadType = async () => {
      if (!typeUuid) {
        setType(new Type());
        return;
      }

      try {
        const loadedType = await repository.get(typeUuid);
        if (loadedType) {
          setType(loadedType);
        } else {
          setType(new Type());
        }
      } catch (error) {
        console.error('Erreur lors du chargement du type:', error);
        setType(new Type());
      }
    };

    loadType();
  }, [typeUuid]);

  const handleParentUuidChange = (uuids: string[]) => {
    const parentUuid = uuids.length > 0 ? uuids[0] : '';
    setType((prev) => {
      const updated = new Type(prev.toData());
      updated.parentUuid = parentUuid;
      return updated;
    });
  };

  return (
    <EntityForm
      endpoint={config.ENDPOINTS_CONSTANTS.TYPES}
      title={type.uuid ? 'Modifier un type' : 'Ajouter un type'}
      entity={type}
      onSave={onSave}
      onCancel={onClose}
    >
      <TextField.Root
        size="2"
        placeholder="Nom du type"
        value={type.name}
        readOnly
      />

      <EntitySelect
        endpoint="types"
        selectedUuids={type.parentUuid ? [type.parentUuid] : []}
        onChange={handleParentUuidChange}
        placeholder="Type parent (optionnel)"
        labelProperty="name"
      />
    </EntityForm>
  );
}
