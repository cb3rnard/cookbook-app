import { TextField } from '@radix-ui/themes';
import { useEffect, useMemo, useState } from 'react';
import { useData } from '../../contexts';
import { EntitySelect } from '../ui/EntitySelect';
import { EntityForm } from './EntityForm';

const formDefaults = {
  uuid: '',
  name: '',
  parent: null
};

export function TypeForm({ typeUuid = null, onSave = null, onClose = null, onCancel = null }) {
  const [formData, setFormData] = useState(formDefaults);
  const [type, setType] = useState(null);
  const [errors, setErrors] = useState({});
  const { getRepository } = useData();
  const repository = useMemo(() => getRepository('types'), [getRepository]);

  useEffect(() => {
    const loadType = async () => {
      if (!typeUuid) {
        setFormData(formDefaults);
        setType(null);
        return;
      }

      try {
        const typeData = await repository.get(typeUuid);
        if (typeData) {
          setFormData({
            uuid: typeData.uuid,
            name: typeData.name,
            parent: typeData.parent || null
          });
          setType(typeData);
        } else {
          setFormData(formDefaults);
          setType(null);
        }
      } catch (error) {
        console.error('Erreur lors du chargement du type:', error);
        setFormData(formDefaults);
        setType(null);
      }
    };

    loadType();
  }, [typeUuid]);

  const handleInputChange = (field, value) => {
    if (field === 'name') {
      return;
    }
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async (data) => {
    try {
      const result = await repository.createOrUpdate(data);
      if (onSave) onSave(result);
      if (onClose) onClose();
    } catch (error) {
      setErrors(error.validationErrors || { general: error.message });
    }
  };

  return (
    <EntityForm
      endpoint="types"
      title={type ? 'Modifier un type' : 'Ajouter un type'}
      formData={formData}
      onSave={handleSave}
      onCancel={onCancel || onClose}
      errors={errors}
      validateForm={(data) => !data.name?.trim()}
    >
      <TextField.Root
        size="2"
        placeholder="Nom du type"
        value={formData.name}
        readOnly
      />

      <EntitySelect
        endpoint="types"
        selectedUuids={formData.parent ? [formData.parent] : []}
        onChange={(value) => handleInputChange('parent', value === '' ? null : value)}
        placeholder="Type parent (optionnel)"
        allowEmpty={true}
      />
    </EntityForm>
  );
};