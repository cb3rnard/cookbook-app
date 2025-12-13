import { Notice } from "@components/ui/Notice";
import { Box, Button, Flex, Heading, Text, TextField } from "@radix-ui/themes";
import { useMemo, useState } from "react";
import { SyncProgress } from "../../components/sync/SyncProgress";
import { CONFIG } from "../../config/config";
import { useSettings } from "../../contexts";
import { useApi } from "../../contexts/ApiContext";
import { useData } from "../../contexts/DataContext";
import { useRecipes } from "../../contexts/RecipesContext";
import { useSync } from "../../contexts/SyncContext";
import { SyncCountBoxes } from "../sync/SyncCountBoxes";

export function SyncSettings() {
  const { connection, session, toggleAutoSync } = useApi();
  const { authenticated } = connection;
  const { syncState, fullSync, incrementalSync, clearOperation } = useSync();
  const { syncing } = syncState;
  const { operation } = syncState;
  const { localCounts, remoteCounts, fetchRemoteCounts } = useData();
  const { setNeedsRefresh } = useRecipes();
  const { settings, setSetting } = useSettings();
  const [syncRequested, setSyncRequested] = useState(false);

  const needsSync = localCounts.hasChanges || remoteCounts.hasChanges;

  const lastSyncDateLocale = useMemo(() => {
    return session.lastSyncDate
      ? new Date(session.lastSyncDate).toLocaleString()
      : null;
  }, [session.lastSyncDate]);

  const handleSync = async () => {
    setSyncRequested(true);
    await fullSync(400);
    setNeedsRefresh(Date.now());
  };

  const handleIncrementalSync = async () => {
    setSyncRequested(true);
    await incrementalSync(400);
    setNeedsRefresh(Date.now());
  };

  const handleCloseProgress = () => {
    setSyncRequested(false);
    clearOperation();
  };

  const handleSettingChange = async (e) => {
    const { id, value } = e.target;
    if (["syncDelayMinutes", "remoteDataRefreshMinutes"].includes(id)) {
      let intValue = parseInt(value, 10);
      if (!intValue || intValue < CONFIG.MIN_REFRESH_MINUTES) {
        intValue = CONFIG.MIN_REFRESH_MINUTES;
      }
      await setSetting(id, intValue);
      return;
    }
    await setSetting(key, value);
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
                <Text as="label" htmlFor="syncDelayMinutes">
                  Délai entre les synchronisations automatiques complètes
                  (minutes)
                </Text>
                <TextField.Root
                  id="syncDelayMinutes"
                  help="Définissez le délai entre chaque synchronisation automatique. Valeur minimale : 5 minutes."
                  size="2"
                  value={settings.syncDelayMinutes || 5}
                  type="number"
                  min="5"
                  onChange={handleSettingChange}
                />
              </Box>
            )}
            <Box>
              <Text as="label" htmlFor="remoteDataRefreshMinutes">
                Délai d'actualisation des données distantes (minutes)
              </Text>
              <TextField.Root
                id="remoteDataRefreshMinutes"
                label="Délai d'actualisation des données distantes"
                description="Définissez la fréquence à laquelle l'application vérifie les modifications distantes. Valeur minimale : 5 minutes."
                size="2"
                value={
                  settings.remoteDataRefreshMinutes ||
                  CONFIG.DEFAULTS.remoteDataRefreshMinutes
                }
                type="number"
                min={CONFIG.MIN_REFRESH_MINUTES}
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
            Aucune synchronisation effectuée.
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
                      <Button onClick={toggleAutoSync} variant="primary">
                        Activer
                      </Button>
                    </div>
                  </Notice>
                )}
              </>
            )}

            <SyncCountBoxes local={localCounts} remote={remoteCounts} />

            {remoteCounts.lastCheck && (
              <Flex gap="1">
                <Text as="div" size="1" color="gray">
                  Dernière actualisation :{" "}
                  {new Date(remoteCounts.lastCheck).toLocaleString()}
                </Text>
                <Button
                  variant="ghost"
                  size="1"
                  onClick={async () => {
                    await fetchRemoteCounts();
                  }}
                  disabled={syncing}
                >
                  Actualiser les données distantes
                </Button>
              </Flex>
            )}
            {authenticated &&
              (localCounts?.hasChanges || remoteCounts?.hasChanges) && (
                <Flex gap="2" wrap="wrap">
                  {needsSync && (
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
                      ? "Re-synchroniser toutes les données"
                      : "Synchroniser toutes les données"}
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
