import { GearIcon, Pencil2Icon, UpdateIcon } from '@radix-ui/react-icons';
import { Box, Button, Flex, Heading, Text } from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import { useSync } from '../../contexts/SyncContext';
import { useView } from '../../contexts/ViewContext';
import { SettingsService } from '../../services';
import { DebugControls } from '../debug/DebugControls';
import styles from './Header.module.css';

export function Header({
  title = "Cookbook",
  storageInfo,
  isPersistent
}) {
  const { isSyncing } = useSync();
  const { openRecipeForm, openSettings } = useView();
  const [showDebugControls, setShowDebugControls] = useState(false);

  const handleNewRecipe = () => {
    openRecipeForm();
  };

  // Charger le setting pour afficher les contrôles debug
  useEffect(() => {
    const loadDebugControlsSetting = async () => {
      try {
        const settings = await SettingsService.getSettings();
        setShowDebugControls(settings.showDebugControls || false);
      } catch (error) {
        console.error('Erreur chargement showDebugControls:', error);
      }
    };
    loadDebugControlsSetting();
  }, []);


  return (
    <Box asChild className={styles.header}>
      <header>
        <Flex gap="2" align="center" justify="between" py="2" px="3">
          <Box className={styles.brand}>
            <Heading className={styles.title}>{title}</Heading>

            {/* Storage info */}
            <Box className={styles.storage}>
              <Box className={`${styles.storageStatus} ${isPersistent ? styles.storageStatusPersistent : styles.storageStatusTemporary}`}>
                {isPersistent ? '✅ Stockage persistent' : '⚠️ Stockage temporaire'}
              </Box>
              {storageInfo && (
                <Text className={styles.storageUsage}>
                  {storageInfo.usagePercentage}% utilisé
                  ({Math.round(storageInfo.usage / 1024 / 1024)}MB / {Math.round(storageInfo.quota / 1024 / 1024)}MB)
                </Text>
              )}
            </Box>
          </Box>

          <Flex direction="column" align="end" gap="2">
            <Box asChild display={{ initial: 'none', sm: 'block' }}>
              <nav>
                <Flex direction="column" align="end" gap="2">
                  <Flex justify="end" align="center" gap="3">
                    <Flex justify="end" align="center" gap="1" wrap="wrap">
                      <Button
                        onClick={handleNewRecipe}
                        size="3"
                      >
                        <Pencil2Icon /> <Text className={styles.buttonText}>Nouvelle recette</Text>
                      </Button>

                      <Button
                        onClick={openSettings}
                        size="3"
                        variant="surface"
                      >
                        <GearIcon /> <Text className={styles.buttonText}>Options</Text>
                      </Button>
                    </Flex>
                    {isSyncing &&
                      <UpdateIcon className={styles.syncIndicator} size="3" />
                    }
                  </Flex>
                </Flex>
              </nav>
            </Box>
            {/* <InstallButton
              size="3"
              color="green"
              variant="surface"
            /> */}
          </Flex>
        </Flex>

        {/* Contrôles debug conditionnels */}
        {showDebugControls && <DebugControls />}
      </header>
    </Box>
  );
};