import { TextField } from '@radix-ui/themes';
import { useEffect, useMemo, useState } from 'react';
import { useData } from '../../contexts';
import { EntityForm } from './EntityForm';

const formDefaults = {
  uuid: '',
  name: '',
  type: '',
};

export function IngredientForm({ ingredientUuid = null, onSave = null, onClose = null, onCancel = null }) {
  const [formData, setFormData] = useState(formDefaults);
  const [ingredient, setIngredient] = useState(null);
  const [errors, setErrors] = useState({});
  const { getRepository } = useData();
  const repository = useMemo(() => getRepository('ingredients'), [getRepository]);

  useEffect(() => {
    const loadIngredient = async () => {
      if (!ingredientUuid) {
        setFormData(formDefaults);
        return;
      };
      const ingredient = await repository.get(ingredientUuid);
      if (!ingredient) {
        setFormData(formDefaults);
        return;
      }
      setFormData(ingredient);
      setIngredient(ingredient);
    };
    loadIngredient();
  }, [ingredientUuid]);


  const handleChange = (e) => {
    if (e.target.name === 'name') {
      return;
    }
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value
    }));
  };

  return (
    <EntityForm
      endpoint="ingredients"
      formData={formData}
      onSave={onSave}
      onCancel={onCancel}
    >
      <TextField.Root
        id="name"
        name="name"
        value={formData.name}
        placeholder="Nom de l'ingrédient"
        readOnly
      />

      <TextField.Root
        id="type"
        name="type"
        value={formData.type}
        onChange={handleChange}
        placeholder="Type d'ingrédient"
        required
      />
    </EntityForm>
  );
};