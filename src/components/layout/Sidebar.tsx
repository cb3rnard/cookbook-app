import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import {
  Box,
  CheckboxGroup,
  Flex,
  Heading,
  Switch,
  Text,
  TextField,
} from '@radix-ui/themes';
import { config, Endpoint } from '@src/config/config';
import { useData } from '@src/contexts/DataContext';
import { useSync } from '@src/contexts/SyncContext';
import { useView } from '@src/contexts/ViewContext';
import { Ingredient } from '@src/models/entities/Ingredient';
import { EventBus } from '@src/services/utils/EventBus';
import {
  DifficultyLevels,
  Entity,
  IngredientData,
  TypeData,
} from '@src/types/entities';
import { RecipeFilters } from '@src/types/repositories';
import { SyncOperationState } from '@src/types/sync';
import classNames from 'classnames';
import { useEffect, useMemo, useState } from 'react';
import styles from './Sidebar.module.css';

const defaultFiltersSets = [
  {
    key: 'difficulties',
    name: 'Niveau',
    options: [] as { uuid: string; name: string }[],
  },
  {
    key: 'types',
    name: 'Types',
    options: [] as { uuid: string; name: string }[],
  },
  {
    key: 'ingredients',
    name: 'Ingrédients',
    options: [] as { uuid: string; name: string }[],
  },
];

export function Sidebar({
  filters,
  onFilterChange,
  isOpen,
}: {
  filters: RecipeFilters;
  onFilterChange: (filters: RecipeFilters) => void;
  isOpen: boolean;
}) {
  const [filtersSets, setFiltersSets] = useState(defaultFiltersSets);
  const { toggleSidebar } = useView();
  const { getRepository } = useData();
  const { syncing } = useSync();
  const recipesRepository = useMemo(
    () => getRepository(config.ENDPOINTS_CONSTANTS.RECIPES),
    [],
  );
  const typesRepository = useMemo(
    () => getRepository(config.ENDPOINTS_CONSTANTS.TYPES),
    [],
  );
  const ingredientsRepository = useMemo(
    () => getRepository(config.ENDPOINTS_CONSTANTS.INGREDIENTS),
    [],
  );

  useEffect(() => {
    const eventBus = EventBus.getInstance();

    const fetchFiltersSets = async () => {
      // Get unique values from lowercase difficulties in recipes
      const allDifficulties = await recipesRepository
        .getUsedDifficultyLevels()
        .then((difficulties: DifficultyLevels[]) => {
          const uniqueDifficulties = new Set(
            difficulties.map((d) => d.toLowerCase()),
          );
          return Array.from(uniqueDifficulties).map((difficulty) => ({
            uuid: difficulty,
            name: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
          }));
        });
      const allTypes = await typesRepository.getUsed();
      const allIngredients = await ingredientsRepository.getUsed(true);
      setFiltersSets([
        {
          key: 'difficulties',
          name: 'Niveau',
          options: allDifficulties,
        },
        {
          key: 'types',
          name: 'Types',
          options: allTypes.map((type) => ({
            uuid: type.uuid,
            name: type.name.charAt(0).toUpperCase() + type.name.slice(1),
          })),
        },
        {
          key: 'ingredients',
          name: 'Ingrédients',
          options: allIngredients.map((ing) => ({
            uuid: ing.uuid,
            name: ing.name.charAt(0).toUpperCase() + ing.name.slice(1),
          })),
        },
      ]);
    };

    const maybeFetchFiltersSets = async ({
      endpoint,
      entity,
    }: {
      endpoint: Endpoint;
      entity: Entity;
    }) => {
      if (!syncing) {
        if (endpoint === config.ENDPOINTS_CONSTANTS.RECIPES) {
          // If a recipe has been saved, maybe some filters need to be updated
          await fetchFiltersSets();
        } else if (
          (config.RECIPES_MAIN_DEPENDENCIES as string[]).includes(endpoint)
        ) {
          // If an ingredient or type has been saved, update in filters sets if needed
          setFiltersSets((currentSets) => {
            const newSets = [...currentSets];
            const index =
              endpoint === config.ENDPOINTS_CONSTANTS.INGREDIENTS ? 2 : 1; // ingredients or types
            const optionsSet = new Set(
              newSets[index].options.map((opt) => opt.uuid),
            );
            if (!optionsSet.has(entity.uuid)) {
              // Types
              if (
                config.ENDPOINTS_CONSTANTS.TYPES === endpoint &&
                (entity as Ingredient).excludeFromFilters === 1
              ) {
                // If type is excluded from filters, do not add it
                newSets[index].options = newSets[index].options.filter(
                  (opt) => opt.uuid !== entity.uuid,
                );
                return newSets;
              }
              newSets[index].options.push({
                uuid: entity.uuid,
                name: (entity as IngredientData | TypeData).name,
              });
            }
            return newSets;
          });
        }
      }
    };

    const fetchFiltersSetsAfterSync = async (
      syncOperation: SyncOperationState,
    ) => {
      // Reload filters after sync if entities have been imported
      if (syncOperation.totals.imported > 0) {
        await fetchFiltersSets();
      }
    };

    const removeFromFiltersSets = async ({
      endpoint,
      uuid,
    }: {
      endpoint: Endpoint;
      uuid: string;
    }) => {
      // If an entity used in filters has been deleted, remove it from filters sets
      setFiltersSets((currentSets) => {
        const newSets = [...currentSets];
        const index =
          endpoint === config.ENDPOINTS_CONSTANTS.INGREDIENTS
            ? 2
            : endpoint === config.ENDPOINTS_CONSTANTS.TYPES
              ? 1
              : -1;
        if (index !== -1) {
          newSets[index].options = newSets[index].options.filter(
            (opt) => opt.uuid !== uuid,
          );
        }
        return newSets;
      });
    };

    fetchFiltersSets();
    eventBus.on('entity:saved', maybeFetchFiltersSets);
    eventBus.on('entity:deleted', removeFromFiltersSets);
    eventBus.on('sync:completed', fetchFiltersSetsAfterSync);

    return () => {
      eventBus.off('entity:saved', maybeFetchFiltersSets);
      eventBus.off('entity:deleted', removeFromFiltersSets);
      eventBus.off('sync:completed', fetchFiltersSetsAfterSync);
    };
  }, [syncing]);

  useEffect(() => {
    const eventBus = EventBus.getInstance();

    eventBus.on('app:clear', () => {
      setFiltersSets(defaultFiltersSets);
    });

    return () => {
      eventBus.off('app:clear', () => {
        setFiltersSets(defaultFiltersSets);
      });
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const name = e.target.name || e.target.id;
    onFilterChange({ ...filters, [name]: value });
  };

  const handleDeletedChange = (checked: boolean) => {
    onFilterChange({ ...filters, deleted: checked });
  };

  const handleCheckListChange = (event: React.MouseEvent<HTMLElement>) => {
    const value = (event.target as HTMLElement).dataset.uuid;
    const key = (event.target as HTMLElement).dataset.key as
      | 'ingredients'
      | 'types'
      | 'difficulties';

    if (filters[key].find((uuid) => uuid === value)) {
      // Remove from filters
      const newValues = filters[key].filter((uuid) => uuid !== value);
      onFilterChange({ ...filters, [key]: newValues });
    } else {
      // Add to filters
      const newValues = [...filters[key], value as string];
      onFilterChange({ ...filters, [key]: newValues });
    }
  };

  const classes = classNames(styles.sidebar, { [styles.sidebarOpen]: isOpen });

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <Box
          className={styles.overlay}
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      <Box asChild className={classes} minWidth="250px">
        <aside>
          <Box className={styles.header}>
            <Heading as="h2" size="5">
              Filtres
            </Heading>
            <Box
              asChild
              className={styles.close}
              onClick={toggleSidebar}
              aria-label="Fermer les filtres"
            >
              <button>×</button>
            </Box>
          </Box>

          <Box p="4">
            {/* Search */}
            <Box className={styles.filterGroup}>
              <Text asChild className={styles.filterLabel}>
                <label htmlFor="search">Rechercher</label>
              </Text>
              <TextField.Root
                id="search"
                placeholder="Nom de recette..."
                value={filters.search || ''}
                onChange={handleSearchChange}
              >
                <TextField.Slot>
                  <MagnifyingGlassIcon />
                </TextField.Slot>
              </TextField.Root>
            </Box>

            {filtersSets.map(
              (set: {
                key: string;
                name: string;
                options: { uuid: string; name: string }[];
              }) =>
                set.options.length > 0 && (
                  <Box key={set.key} className={styles.filterGroup}>
                    <Text className={styles.filterLabel}>{set.name}</Text>
                    <Box className={styles.filterOptions}>
                      <CheckboxGroup.Root size="2">
                        {set.options.map((option) => (
                          <CheckboxGroup.Item
                            key={`${set.key}-radix-${option.uuid}`}
                            value={option.uuid}
                            data-uuid={option.uuid}
                            data-key={set.key}
                            onClick={handleCheckListChange}
                          >
                            {option.name}
                          </CheckboxGroup.Item>
                        ))}
                      </CheckboxGroup.Root>
                    </Box>
                  </Box>
                ),
            )}
            <Box className={styles.filterGroup}>
              <Text className={styles.filterLabel}>
                Inclure les recettes supprimées
              </Text>
              <Flex align="center" gap="2">
                <Switch
                  size="2"
                  checked={filters?.deleted || false}
                  onCheckedChange={handleDeletedChange}
                />
                <Text size="2">{filters?.deleted ? 'Oui' : 'Non'}</Text>
              </Flex>
            </Box>
          </Box>
        </aside>
      </Box>
    </>
  );
}
