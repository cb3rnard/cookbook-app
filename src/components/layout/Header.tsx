import { GearIcon, Pencil2Icon, UpdateIcon } from '@radix-ui/react-icons';
import { Box, Button, Flex, Heading, Text } from '@radix-ui/themes';
import { StorageEstimate } from '@src/types/storage';
import { useEffect, useState } from 'react';
import { useConfig } from '../../contexts/ConfigContext';
import { useSync } from '../../contexts/SyncContext';
import { useView } from '../../contexts/ViewContext';
import { DebugControls } from '../debug/DebugControls';
import { InstallButton } from '../ui/InstallButton';
import styles from './Header.module.css';

export function Header({
  title = 'Cookbook',
  storageInfo,
  isPersistent = false,
}: {
  title?: string;
  storageInfo?: StorageEstimate;
  isPersistent?: boolean;
}) {
  const { config } = useConfig();
  const { syncing } = useSync();
  const { openRecipeForm, openSettings } = useView();
  const [showDebugControls, setShowDebugControls] = useState(false);

  const handleNewRecipe = () => {
    openRecipeForm();
  };

  // Charger le setting pour afficher les contrôles debug
  useEffect(() => {
    setShowDebugControls(config.showDebugControls || false);
  }, [config.showDebugControls]);

  return (
    <Box asChild className={styles.header}>
      <header>
        <Flex gap="2" align="center" justify="between" py="2" px="3">
          <Flex direction="column" align="start" gap="2">
            <Heading size="8">{title}</Heading>

            {/* Storage info */}
            <Flex direction="column" align="start" gap="1">
              <Box
                className={`${styles.storageStatus} ${isPersistent ? styles.storageStatusPersistent : styles.storageStatusTemporary}`}
              >
                {isPersistent
                  ? '✅ Stockage persistent'
                  : '⚠️ Stockage temporaire'}
              </Box>
              {storageInfo && (
                <Text color="gray" size="1">
                  {storageInfo.usagePercentage}% utilisé (
                  {Math.round(storageInfo.usage / 1024 / 1024)}MB /{' '}
                  {Math.round(storageInfo.quota / 1024 / 1024)}MB)
                </Text>
              )}
            </Flex>
          </Flex>

          <Flex direction="column" align="end" gap="2">
            <Box asChild display={{ initial: 'none', sm: 'block' }}>
              <nav>
                <Flex direction="column" align="end" gap="2">
                  <Flex justify="end" align="center" gap="3">
                    <Flex justify="end" align="center" gap="1" wrap="wrap">
                      <Button onClick={handleNewRecipe} size="3">
                        <Pencil2Icon /> <Text>Nouvelle recette</Text>
                      </Button>

                      <Button onClick={openSettings} size="3" variant="surface">
                        <GearIcon /> <Text>Options</Text>
                      </Button>
                    </Flex>
                    {syncing && <UpdateIcon className={styles.syncIndicator} />}
                  </Flex>
                </Flex>
              </nav>
            </Box>
            <InstallButton size="3" color="green" variant="surface" />
          </Flex>
        </Flex>

        {/* Contrôles debug conditionnels */}
        {showDebugControls && <DebugControls />}
      </header>
    </Box>
  );
}
