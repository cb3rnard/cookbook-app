import { Notice } from '@components/ui/Notice';
import { Box, Button, Flex, Heading, Text, TextField } from '@radix-ui/themes';
import { useApi } from '@src/contexts/ApiContext';
import { useConfig } from '@src/contexts/ConfigContext';
import { useData } from '@src/contexts/DataContext';
import { useRecipes } from '@src/contexts/RecipesContext';
import { useSync } from '@src/contexts/SyncContext';
import { useMemo, useState } from 'react';
import { config, CONSTANTS_SYNC } from '../../config/config';
import { SyncCountBoxes } from '../sync/SyncCountBoxes';
import { SyncProgress } from '../sync/SyncProgress';

export function SyncOptionsPanel() {
  const { connection, session, toggleAutoSync } = useApi();
  const { authenticated } = connection;
  const { syncState, fullSync, incrementalSync, clearOperation } = useSync();
  const { syncing } = syncState;
  const { localCounts, remoteCounts, refreshAllCounts } = useData();
  const { refreshRecipes } = useRecipes();
  const { setConfig } = useConfig();
  const [syncRequested, setSyncRequested] = useState(false);

  const needsSync = localCounts.hasChanges || remoteCounts.hasChanges;
  const isInitialSync = localCounts.empty || remoteCounts.empty;

  const lastSyncDateLocale = useMemo(() => {
    return session.lastSyncDate
      ? new Date(session.lastSyncDate).toLocaleString()
      : null;
  }, [session.lastSyncDate]);

  const handleSync = async () => {
    setSyncRequested(true);
    await fullSync(400);
    await refreshRecipes();
  };

  const handleIncrementalSync = async () => {
    setSyncRequested(true);
    await incrementalSync(400);
    await refreshRecipes();
  };

  const handleCloseProgress = () => {
    setSyncRequested(false);
    clearOperation();
  };

  const handleSettingChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { id, value } = e.target;
    if (['SYNC_DELAY_MIN', 'REMOTE_DATA_REFRESH_MIN'].includes(id)) {
      let intValue = parseInt(value, 10);
      if (!intValue || intValue < CONSTANTS_SYNC.MIN_REFRESH_MINUTES) {
        intValue = CONSTANTS_SYNC.MIN_REFRESH_MINUTES;
      }
      await setConfig(id, intValue);
      return;
    }
    await setConfig(id, value);
  };

  const DelaySettings = () => {
    return (
      <Box asChild mt="6">
        <form>
          <Heading as="h3" size="3" mb="2">
            Délais de synchronisation
          </Heading>
          <Flex gap="4">
            {session.autoSync && (
              <Box>
                <Text as="label" htmlFor="SYNC_DELAY_MIN">
                  Délai entre les synchronisations automatiques complètes
                  (minutes)
                </Text>
                <TextField.Root
                  id="SYNC_DELAY_MIN"
                  size="2"
                  value={config.SYNC_DELAY_MIN}
                  type="number"
                  min={CONSTANTS_SYNC.MIN_REFRESH_MINUTES}
                  onChange={handleSettingChange}
                />
              </Box>
            )}
            <Box>
              <Text as="label" htmlFor="REMOTE_DATA_REFRESH_MIN">
                Délai d&apos;actualisation des données distantes (minutes)
              </Text>
              <TextField.Root
                id="REMOTE_DATA_REFRESH_MIN"
                size="2"
                value={config.REMOTE_DATA_REFRESH_MIN}
                type="number"
                min={CONSTANTS_SYNC.MIN_REFRESH_MINUTES}
                onChange={handleSettingChange}
              />
            </Box>
          </Flex>
        </form>
      </Box>
    );
  };

  return (
    <Flex className="settings__panel" direction="column" gap="2">
      <Heading as="h2">Synchronisation</Heading>
      <Flex direction="column" gap="4">
        {lastSyncDateLocale ? (
          <Text as="div" size="1" color="gray">
            Dernière synchronisation : {lastSyncDateLocale}
          </Text>
        ) : (
          <Text as="div" size="1" color="gray">
            Aucune synchronisation complétée.
          </Text>
        )}

        {syncRequested ? (
          <>
            <SyncProgress onClose={handleCloseProgress} />
          </>
        ) : (
          <>
            {session.active && (
              <>
                {session.autoSync ? (
                  // Connecté et synchronisation active
                  <Notice
                    type="success"
                    title="La synchronisation automatique est active"
                    size="2"
                  >
                    <div>
                      <Button onClick={toggleAutoSync} variant="surface">
                        Désactiver
                      </Button>
                    </div>
                  </Notice>
                ) : (
                  // Connecté mais synchronisation inactive
                  <Notice
                    type="warning"
                    title="La synchronisation automatique est désactivée"
                    size="2"
                  >
                    <div>
                      <Button onClick={toggleAutoSync}>Activer</Button>
                    </div>
                  </Notice>
                )}
              </>
            )}

            <SyncCountBoxes local={localCounts} remote={remoteCounts} />

            {remoteCounts.lastCheck && (
              <Flex gap="1">
                <Text as="div" size="1" color="gray">
                  Dernière actualisation :{' '}
                  {new Date(remoteCounts.lastCheck).toLocaleString()}
                </Text>
                <Button
                  variant="ghost"
                  size="1"
                  onClick={async () => {
                    await refreshAllCounts();
                  }}
                  disabled={syncing}
                >
                  Actualiser les données
                </Button>
              </Flex>
            )}
            {authenticated && (
              <Flex gap="2" wrap="wrap">
                {needsSync && !isInitialSync && (
                  <Button
                    className="settings__sync button"
                    onClick={handleIncrementalSync}
                    disabled={syncing}
                  >
                    Synchroniser les données modifiées
                  </Button>
                )}
                <Button
                  className="settings__sync button"
                  onClick={handleSync}
                  variant="surface"
                  disabled={syncing}
                >
                  {session.lastSyncDate
                    ? 'Re-synchroniser toutes les données'
                    : 'Synchroniser toutes les données'}
                </Button>
              </Flex>
            )}
          </>
        )}
      </Flex>
      {session.active && <DelaySettings />}
    </Flex>
  );
}
