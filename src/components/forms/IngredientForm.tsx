import { Box, Flex, Switch, Text, TextField } from '@radix-ui/themes';
import { config } from '@src/config/config';
import { useData } from '@src/contexts/DataContext';
import { Ingredient } from '@src/models/entities/Ingredient';
import { useEffect, useMemo, useState } from 'react';
import { EntityForm } from './EntityForm';

export function IngredientForm({
  ingredientUuid = '',
  onSave,
  onClose,
}: {
  ingredientUuid?: string;
  onSave?: (savedIngredient: Ingredient) => void;
  onClose?: () => void;
}) {
  const [ingredient, setIngredient] = useState<Ingredient>(
    () => new Ingredient(),
  );
  const { getRepository } = useData();
  const repository = useMemo(
    () => getRepository('ingredients'),
    [getRepository],
  );

  useEffect(() => {
    const loadIngredient = async () => {
      if (!ingredientUuid) {
        setIngredient(new Ingredient());
        return;
      }
      const loadedIngredient = await repository.get(ingredientUuid);
      if (!loadedIngredient) {
        setIngredient(new Ingredient());
        return;
      }
      setIngredient(loadedIngredient);
    };
    loadIngredient();
  }, [ingredientUuid]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'name') {
      return; // Name is readonly
    }
    setIngredient((prev) => {
      const updated = new Ingredient(prev.toData());
      if (name === 'type') updated.type = value;
      return updated;
    });
  };

  const handleExcludeFromFiltersChange = (checked: boolean) => {
    setIngredient((prev) => {
      const updated = new Ingredient(prev.toData());
      updated.excludeFromFilters = checked ? 1 : 0;
      return updated;
    });
  };

  return (
    <EntityForm
      endpoint={config.ENDPOINTS_CONSTANTS.INGREDIENTS}
      entity={ingredient}
      onSave={onSave}
      onCancel={onClose}
    >
      <TextField.Root
        id="name"
        name="name"
        value={ingredient.name}
        placeholder="Nom de l'ingrédient"
        readOnly
      />

      <TextField.Root
        id="type"
        name="type"
        value={ingredient.type}
        onChange={handleChange}
        placeholder="Type d'ingrédient"
      />
      <Box>
        <Text as="label" className="label" htmlFor="excludeFromFilters">
          Exclure des filtres
        </Text>
        <Flex align="center" gap="2">
          <Switch
            id="excludeFromFilters"
            size="2"
            checked={ingredient.excludeFromFilters === 1}
            onCheckedChange={handleExcludeFromFiltersChange}
          />
          <Text size="2">
            {ingredient.excludeFromFilters === 1 ? 'Oui' : 'Non'}
          </Text>
        </Flex>
      </Box>
    </EntityForm>
  );
}
