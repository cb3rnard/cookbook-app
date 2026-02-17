import { Endpoint } from '@src/config/config';
import { useData } from '@src/contexts/DataContext';
import { Entity } from '@src/types/entities';
import { useEffect, useMemo, useState } from 'react';
import CreatableSelect from 'react-select/creatable';

interface EntitySelectOption {
  value: string;
  label: string;
  entity: Entity;
}

export function EntitySelect(props: {
  endpoint: Endpoint;
  selectedUuids: string[];
  className?: string;
  placeholder?: string;
  onChange: (selectedUuids: string[]) => void;
  isMulti?: boolean;
  labelProperty?: string;
}) {
  const {
    endpoint,
    selectedUuids = [],
    className = '',
    placeholder = 'Sélectionner',
    onChange,
    isMulti = false,
    labelProperty = '',
  } = props;
  const [selectedOptions, setSelectedOptions] = useState<
    EntitySelectOption | EntitySelectOption[] | null
  >(isMulti ? [] : null);
  const [options, setOptions] = useState<EntitySelectOption[]>([]);

  const { getRepository } = useData();
  const repository = useMemo(
    () => getRepository(endpoint),
    [getRepository, endpoint],
  );

  // Fonction utilitaire pour éviter les doublons d'UUIDs
  const deduplicateUuids = (uuids: string[]) => {
    return [...new Set(uuids)];
  };

  // Options filtrées pour éviter les doublons en mode multi
  const filteredOptions = useMemo(() => {
    if (!isMulti) {
      return options; // Pas de filtrage en mode single
    }
    // En mode multi, retire les options déjà sélectionnées
    const selectedValues = selectedUuids || [];
    return options.filter((option) => !selectedValues.includes(option.value));
  }, [options, selectedUuids, isMulti]);

  useEffect(() => {
    const fetchDefaultOptions = async () => {
      const items = await repository.getAll();
      return items.map((item) => {
        const label =
          labelProperty && labelProperty in item
            ? String((item as any)[labelProperty])
            : item.uuid;

        return {
          value: item.uuid,
          label: label,
          entity: item,
        };
      });
    };
    try {
      fetchDefaultOptions().then((fetchedOptions) => {
        setOptions(fetchedOptions);
      });
    } catch (error) {
      console.error('EntitySelect: Error fetching default options:', error);
    }
  }, [repository, labelProperty]);

  const hasInitialValue = useMemo(() => {
    return selectedUuids && selectedUuids.length > 0;
  }, [selectedUuids]);

  useEffect(() => {
    if (hasInitialValue) {
      if (isMulti) {
        // Mode multi : construire les options sélectionnées à partir des UUIDs, éviter les doublons
        const uniqueUuids = deduplicateUuids(selectedUuids);
        const selectedOpts = uniqueUuids
          .map((uuid) => {
            if (!uuid) return null;
            return (
              options.find((opt) => opt.value === uuid) ?? {
                value: uuid,
                label: '(entité manquante)',
                entity: repository.constructEntity({
                  uuid,
                  name: '(entité manquante)',
                }),
              }
            );
          })
          .filter((opt) => opt !== null) as EntitySelectOption[];
        // setOptions((prevOptions) => {
        //   // Ajouter les options manquantes aux options si nécessaire
        //   const newOptions = [...prevOptions];
        //   selectedOpts.forEach((selectedOpt) => {
        //     if (!newOptions.find((opt) => opt.value === selectedOpt.value)) {
        //       newOptions.push(selectedOpt);
        //     }
        //   });
        //   return newOptions;
        // });
        setSelectedOptions(selectedOpts ?? []);
      } else {
        // Mode single : trouver l'option correspondante (premier UUID du tableau)
        if (!selectedUuids[0]) {
          setSelectedOptions(null);
          return;
        }
        const selectedOpt = options.find(
          (opt) => opt.value === selectedUuids[0],
        ) ?? {
          value: selectedUuids[0],
          label: '(entité manquante)',
          entity: repository.constructEntity({
            uuid: selectedUuids[0],
            name: '(entité manquante)',
          }),
        };
        setSelectedOptions(selectedOpt);
      }
    } else if (!hasInitialValue) {
      setSelectedOptions(isMulti ? [] : null);
    }
  }, [hasInitialValue, selectedUuids, isMulti, options]);

  const handleSelect = (
    selectedOptions: EntitySelectOption | EntitySelectOption[] | null,
  ) => {
    setSelectedOptions(selectedOptions);

    if (Array.isArray(selectedOptions)) {
      // Mode multi : renvoie un array d'UUIDs dédupliqués
      const uuids = selectedOptions
        ? selectedOptions.map((opt) => opt.value)
        : [];
      const uniqueUuids = deduplicateUuids(uuids);
      onChange(uniqueUuids);
    } else {
      // Mode single : renvoie un array avec un seul UUID ou array vide
      const uuids = selectedOptions ? [selectedOptions.value] : [];
      onChange(uuids);
    }
  };

  const handleCreateOption = async (newValue: string) => {
    const entity = repository.constructEntity({ [labelProperty]: newValue });

    try {
      await (repository as any).save(entity);
      const newOption = {
        value: entity.uuid,
        label: (entity as any)[labelProperty] as string,
        entity: entity, // Ajouter l'entité complète
      };
      setOptions((prevOptions) => [...prevOptions, newOption]);
      if (isMulti) {
        const selectedOpts = Array.isArray(selectedOptions)
          ? selectedOptions
          : [];
        setSelectedOptions([...selectedOpts, newOption]);
        // Mode multi : ajoute le nouvel UUID à la liste (dédupliqué)
        const newUuids = deduplicateUuids([...selectedUuids, entity.uuid]);
        onChange(newUuids);
      } else {
        setSelectedOptions(newOption);
        // Mode single : remplace par le nouvel UUID
        onChange([entity.uuid]);
      }
    } catch (error) {
      console.error(
        'EntitySelect: handleCreateOption: error saving entity:',
        error,
      );
    }
  };

  return (
    <CreatableSelect
      className={className}
      isClearable
      onChange={(value) =>
        handleSelect(value as EntitySelectOption | EntitySelectOption[] | null)
      }
      options={filteredOptions}
      value={selectedOptions}
      onCreateOption={handleCreateOption}
      placeholder={placeholder}
      isMulti={isMulti}
      styles={{
        multiValue: (base, state) => ({
          ...base,
          backgroundColor:
            state.data.label === '(entité manquante)'
              ? '#fee'
              : base.backgroundColor,
        }),
        multiValueLabel: (base, state) => ({
          ...base,
          color:
            state.data.label === '(entité manquante)' ? '#c00' : base.color,
        }),
        singleValue: (base, state) => ({
          ...base,
          color:
            state.data.label === '(entité manquante)' ? '#c00' : base.color,
          fontSize: '.825rem',
        }),
        control: (base, state) => ({
          ...base,
          backgroundColor:
            !isMulti &&
            state.hasValue &&
            (state.getValue()[0] as EntitySelectOption)?.label ===
              '(entité manquante)'
              ? '#fee'
              : base.backgroundColor,
        }),
      }}
    />
  );
}
