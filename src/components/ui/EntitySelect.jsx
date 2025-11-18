import { useEffect, useMemo, useState } from 'react';
import CreatableSelect from 'react-select/creatable';
import { useData } from '../../contexts';

export function EntitySelect(props) {
    const {
        endpoint = null,
        selectedUuids = [],
        className = '',
        placeholder = 'Sélectionner',
        onChange,
        isMulti = null,
    } = props;
    // const [value, setValue] = useState(props.value || {});
    const [selectedOptions, setSelectedOptions] = useState(isMulti ? [] : null);
    const [options, setOptions] = useState([]);

    const { getRepository } = useData();
    const repository = useMemo(() => getRepository(endpoint), [getRepository, endpoint]);

    // Fonction utilitaire pour éviter les doublons d'UUIDs
    const deduplicateUuids = (uuids) => {
        return [...new Set(uuids)];
    };

    // Options filtrées pour éviter les doublons en mode multi
    const filteredOptions = useMemo(() => {
        if (!isMulti) {
            return options; // Pas de filtrage en mode single
        }
        // En mode multi, retire les options déjà sélectionnées
        const selectedValues = selectedUuids || [];
        return options.filter(option => !selectedValues.includes(option.value));
    }, [options, selectedUuids, isMulti]);

    useEffect(() => {
        const fetchDefaultOptions = async () => {
            const items = await repository.getAll({}, {}, false);
            return items.map(item => ({
                value: item.uuid,
                label: item.name,
                entity: item,
            }));
        };
        try {
            fetchDefaultOptions().then(fetchedOptions => {
                setOptions(fetchedOptions);
            });
        }
        catch (error) {
            console.error('EntitySelect: Error fetching default options:', error);
        }
    }, [repository]);

    const hasInitialValue = useMemo(() => {
        return selectedUuids && selectedUuids.length > 0;
    }, [selectedUuids]);

    const hasSelectedOption = useMemo(() => {
        if (!selectedOptions || (Array.isArray(selectedOptions) && selectedOptions.length === 0)) {
            return false;
        } else {
            return true;
        }
    }, [selectedOptions]);

    useEffect(() => {
        if (hasInitialValue && options.length > 0) {
            if (isMulti) {
                // Mode multi : construire les options sélectionnées à partir des UUIDs, éviter les doublons
                const uniqueUuids = deduplicateUuids(selectedUuids);
                const selectedOpts = uniqueUuids.map(uuid =>
                    options.find(opt => opt.value === uuid)
                ).filter(Boolean);
                setSelectedOptions(selectedOpts);
            } else {
                // Mode single : trouver l'option correspondante (premier UUID du tableau)
                const selectedOpt = selectedUuids.length > 0
                    ? options.find(opt => opt.value === selectedUuids[0])
                    : null;
                setSelectedOptions(selectedOpt || null);
            }
        } else if (!hasInitialValue) {
            setSelectedOptions(isMulti ? [] : null);
        }
    }, [hasInitialValue, selectedUuids, isMulti, options]);
    // ('EntitySelect: selectedOptions:', selectedOptions);

    const handleSelect = (selectedOptions) => {
        setSelectedOptions(selectedOptions);

        if (isMulti) {
            // Mode multi : renvoie un array d'UUIDs dédupliqués
            const uuids = selectedOptions ? selectedOptions.map(opt => opt.value) : [];
            const uniqueUuids = deduplicateUuids(uuids);
            onChange(uniqueUuids);
        } else {
            // Mode single : renvoie un array avec un seul UUID ou array vide
            const uuids = selectedOptions ? [selectedOptions.value] : [];
            onChange(uuids);
        }
    }

    const handleCreateOption = async (newValue) => {
        const entityData = { name: newValue };

        await repository.save(entityData).then((entity) => {
            const newOption = {
                value: entity.uuid,
                label: entity.name,
                entity: entity, // Ajouter l'entité complète
            };
            setOptions(prevOptions => [...prevOptions, newOption]);
            if (isMulti) {
                setSelectedOptions(prevSelected => [...prevSelected, newOption]);
                // Mode multi : ajoute le nouvel UUID à la liste (dédupliqué)
                const newUuids = deduplicateUuids([...selectedUuids, entity.uuid]);
                onChange(newUuids);
            } else {
                setSelectedOptions(newOption);
                // Mode single : remplace par le nouvel UUID
                onChange([entity.uuid]);
            }
        }
        ).catch(error => {
            console.error('EntitySelect: handleCreateOption: error saving entity:', error);
        });
    }

    return (
        <CreatableSelect
            className={className}
            isClearable
            onChange={handleSelect}
            options={filteredOptions}
            value={selectedOptions}
            onCreateOption={handleCreateOption}
            placeholder={placeholder}
            isMulti={isMulti}
        />
    );
}