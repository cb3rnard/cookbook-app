import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { Box, CheckboxGroup, Flex, Heading, Switch, Text, TextField } from '@radix-ui/themes';
import classNames from 'classnames';
import { useEffect, useMemo, useState } from 'react';
import { useData, useView } from '../../contexts';
import styles from './Sidebar.module.css';

export function Sidebar({ filters, onFilterChange, isOpen }) {
  const [searchTerm, setSearchTerm] = useState(filters?.search || '');
  const [filtersSets, setFiltersSets] = useState([]);
  const { toggleSidebar } = useView();
  const { getRepository } = useData();
  const recipesRepository = useMemo(() => getRepository('recipes'), [getRepository]);
  const typesRepository = useMemo(() => getRepository('types'), [getRepository]);
  const ingredientsRepository = useMemo(() => getRepository('ingredients'), [getRepository]);

  useEffect(() => {
    const fetchFiltersSets = async () => {
      // Get unique values from lowercase difficulties in recipes
      const allDifficulties = await recipesRepository.getUsedDifficultyLevels().then(difficulties => {
        const uniqueDifficulties = new Set(difficulties.map(d => d.toLowerCase()));
        return Array.from(uniqueDifficulties).map(difficulty => ({
          uuid: difficulty,
          name: difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
        }));
      });
      const allTypes = await typesRepository.getUsed();
      const allIngredients = await ingredientsRepository.getUsed();
      setFiltersSets([
        {
          key: 'difficulties',
          name: 'Niveau',
          options: allDifficulties,
        },
        {
          key: 'types',
          name: 'Types',
          options: allTypes.map(type => ({
            uuid: type.uuid,
            name: type.name.charAt(0).toUpperCase() + type.name.slice(1)
          })),
        },
        {
          key: 'ingredients',
          name: 'Ingrédients',
          options: allIngredients.map(ing => ({
            uuid: ing.uuid,
            name: ing.name.charAt(0).toUpperCase() + ing.name.slice(1)
          })),
        }
      ]);
    };
    fetchFiltersSets();
  }, []);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    onFilterChange({ ...filters, search: value });
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
            <Heading as="h2" size="5">Filtres</Heading>
            <Box
              asChild
              className={styles.close}
              onClick={toggleSidebar}
              aria-label="Fermer les filtres"
            >
              <button>
                ×
              </button>
            </Box>
          </Box>

          <Box p="4">
            {/* Search */}
            <Box className={styles.filterGroup}>
              <Text asChild className={styles.filterLabel}>
                <label htmlFor="search">
                  Rechercher
                </label>
              </Text>
              <TextField.Root
                id="search"
                placeholder="Nom de recette..."
                value={searchTerm}
                onChange={handleSearchChange}
              >
                <TextField.Slot>
                  <MagnifyingGlassIcon />
                </TextField.Slot>
              </TextField.Root>
            </Box>

            {filtersSets.map((set) => (
              <Box key={set.key} className={styles.filterGroup}>
                <Text className={styles.filterLabel}>{set.name}</Text>
                <Box className={styles.filterOptions}>
                  <CheckboxGroup.Root size="2">
                    {set.options.map((option) => (
                      <CheckboxGroup.Item
                        key={`${set.key}-radix-${option.uuid}`}
                        value={option.uuid}
                        checked={filters?.[set.key]?.includes(option.uuid) || false}
                        onClick={() => {
                          const checked = !(filters?.[set.key]?.includes(option.uuid) || false);
                          const currentValues = filters?.[set.key] || [];
                          const newValues = checked
                            ? [...currentValues, option.uuid]
                            : currentValues.filter(id => id !== option.uuid);
                          onFilterChange({ ...filters, [set.key]: newValues });
                        }}
                      >
                        {option.name}
                      </CheckboxGroup.Item>
                    ))}
                  </CheckboxGroup.Root>
                </Box>
              </Box>
            ))}
            <Box className={styles.filterGroup}>
              <Text className={styles.filterLabel}>Inclure les recettes supprimées</Text>
              <Flex align="center" gap="2">
                <Switch
                  size="2"
                  checked={filters?.deleted || false}
                  onCheckedChange={(checked) => {
                    onFilterChange({ ...filters, deleted: checked });
                  }}
                />
                <Text size="2">{filters?.deleted ? 'Oui' : 'Non'}</Text>
              </Flex>
            </Box>
          </Box>
        </aside>
      </Box>
    </>
  );
};