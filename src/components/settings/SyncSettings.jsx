import { Notice } from "@components/ui/Notice";
import { Box, Button, Flex, Heading, Strong, Text } from "@radix-ui/themes";
import { useEffect, useMemo } from "react";
import { SyncProgress } from "../../components/sync/SyncProgress";
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
  const { localCounts, remoteCounts, refreshAllCounts } = useData();
  const { setNeedsRefresh } = useRecipes();

  const lastSyncDateLocale = useMemo(() => {
    return session.lastSyncDate
      ? new Date(session.lastSyncDate).toLocaleString()
      : null;
  }, [session.lastSyncDate]);

  // Refresh local and remote count on mount
  useEffect(() => {
    const fetchData = async () => {
      await refreshAllCounts();
    };
    fetchData();
  }, [refreshAllCounts]);

  const handleSync = async () => {
    try {
      console.log("Lancement de la synchronisation complète...");
      const results = await fullSync(400);
      setNeedsRefresh(Date.now());
    } catch (error) {}
  };

  const handleIncrementalSync = async () => {
    try {
      const results = await incrementalSync(400);
      setNeedsRefresh(Date.now());
    } catch (error) {}
  };

  const Errors = useMemo(() => {
    if (!operation.completed) {
      return null;
    }
    return operation.summary.errors.map((err, index) => (
      <Box key={index}>
        <Text as="p" size="2" color="red">
          {err.message}
        </Text>
        {(err.step.entity || err.step.action) && (
          <Text>
            {err.step.entity && <Strong>{err.step.entity}</Strong>}
            {err.step.entity && err.step.action && " | "}
            {err.step.action}
          </Text>
        )}
        {index < operation.summary.errors.length - 1 ? <br /> : null}
      </Box>
    ));
  }, [operation.completed, operation.summary.errors]);

  return (
    <Flex className="settings__panel" direction="column" gap="2">
      <Heading as="h2">Synchronisation</Heading>
      <Flex direction="column" gap="4">
        {session.lastSyncDateLocale ? (
          <Text as="div" size="1" color="gray">
            Dernière synchronisation : {lastSyncDateLocale}
          </Text>
        ) : (
          <Text as="div" size="1" color="gray">
            Aucune synchronisation effectuée.
          </Text>
        )}

        {syncing || operation.completed ? (
          <>
            <SyncProgress onClose={clearOperation} />
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
            {localCounts?.hasChanges || remoteCounts?.hasChanges ? (
              <Notice
                type="warning"
                title="Des modifications n'ont pas été synchronisées"
                message="Veuillez lancer une synchronisation pour mettre à jour les données."
                size="2"
              />
            ) : (
              localCounts?.all.length === 0 &&
              remoteCounts?.all.length === 0 && (
                <Notice
                  type="info"
                  title="Aucune donnée à synchroniser"
                  message="Aucune recette trouvée localement ou sur l'API."
                  size="2"
                />
              )
            )}
            {authenticated && (
              <Flex gap="2" wrap="wrap">
                <Button
                  className="settings__sync button"
                  onClick={handleIncrementalSync}
                  disabled={syncing}
                >
                  Synchroniser les données modifiées
                </Button>
                <Button
                  className="settings__sync button"
                  onClick={handleSync}
                  variant="surface"
                  disabled={syncing}
                >
                  Synchroniser toutes les données
                </Button>
              </Flex>
            )}
          </>
        )}
      </Flex>
    </Flex>
  );
}
