import { SyncProgress } from '@components/sync/SyncProgress';
import { Notice } from '@components/ui/Notice';
import { Button, Flex, Heading, Text } from '@radix-ui/themes';
import { useEffect, useMemo } from 'react';
import { useApi } from '../../contexts/ApiContext';
import { useData } from '../../contexts/DataContext';
import { useRecipes } from '../../contexts/RecipesContext';
import { useSync } from '../../contexts/SyncContext';
import { SyncCountBoxes } from '../sync/SyncCountBoxes';

export function SyncSettings() {
  // Navigation entre vues
  const { connection } = useApi();
  const { isAuthenticated } = connection;
  const { status, statusService, enableAutoSync, disableAutoSync, fullSync, incrementalSync, syncErrors } = useSync();
  const { localCounts, remoteCounts, refreshAllCounts } = useData();
  const { setNeedsRefresh } = useRecipes();

  useEffect(() => {
    if (statusService) {
      statusService.resetSyncOver();
    }
  }, [statusService]);

  // Charger les counts au démarrage
  useEffect(() => {
    const fetchData = async () => {
      await refreshAllCounts();
    };
    fetchData();
  }, [refreshAllCounts]);

  const resetView = () => {
    statusService.resetSyncOver();
  };

  const handleSync = async () => {
    try {
      console.log('Lancement de la synchronisation complète...');
      const results = await fullSync(400);
      setNeedsRefresh(Date.now());
    } catch (error) {
    }
  };

  const handleIncrementalSync = async () => {
    try {
      const results = await incrementalSync(400);
      setNeedsRefresh(Date.now());
    } catch (error) {
    }
  };

  const handleDisableAutoSync = async () => {
    await disableAutoSync();
    resetView();
  };

  const handleEnableAutoSync = async () => {
    await enableAutoSync();
    resetView();
  };

  const error = useMemo(() => {
    if (status.isSyncOver) {
      if (status.syncErrors && status.syncErrors.length > 0) {
        return status.syncErrors.map((e, index) => (<span key={index}>{e.message}{index < status.syncErrors.length - 1 ? <br /> : null}</span>));
      }
    }
    return null;
  }, [status]);

  return (
    <Flex className="settings__panel" direction="column" gap="2">
      <Heading as="h2">Synchronisation</Heading>
      <Flex direction="column" gap="4">

        {status.lastSync ? (
          <Text as="div" size="1" color="gray">
            Dernière synchronisation : {new Date(status.lastSync).toLocaleString()}
          </Text>
        ) : (
          <Text as="div" size="1" color="gray">
            Aucune synchronisation effectuée.
          </Text>
        )}

        {(status.isSyncing || status.isSyncOver) ? (
          <>
            <Heading as="h5" size="2">Synchronisation en cours...</Heading>
            <SyncProgress onClose={resetView} />
          </>
        ) : (
          <>
            {status.autoSync ? (
              // Connecté et synchronisation active
              <Notice
                type="success"
                title="La synchronisation automatique est active"
                size="2"
              >
                <div>
                  <Button onClick={handleDisableAutoSync} variant="surface">
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
                  <Button onClick={handleEnableAutoSync}>
                    Activer
                  </Button>
                </div>
              </Notice>
            )}

            <SyncCountBoxes local={localCounts} remote={remoteCounts} />
            {(localCounts?.hasChanges || remoteCounts?.hasChanges) ? (
              <Notice
                type="warning"
                title="Des modifications n'ont pas été synchronisées"
                message="Veuillez lancer une synchronisation pour mettre à jour les données."
                size="2"
              />
            ) : (
              (localCounts?.all.length === 0 && remoteCounts?.all.length === 0) && (
                <Notice
                  type="info"
                  title="Aucune donnée à synchroniser"
                  message="Aucune recette trouvée localement ou sur l'API."
                  size="2"
                />
              )
            )}
            {isAuthenticated &&
              <Flex gap="2" wrap="wrap">
                <Button className="settings__sync button" onClick={handleIncrementalSync} disabled={status.isSyncing}>
                  Synchroniser les données modifiées
                </Button>
                <Button className="settings__sync button" onClick={handleSync} variant="surface" disabled={status.isSyncing}>
                  Synchroniser toutes les données
                </Button>
              </Flex>
            }
          </>
        )}
      </Flex>
    </Flex>
  );
}