import { UpdateIcon } from '@radix-ui/react-icons';
import { Button, Flex } from '@radix-ui/themes';
import { useMemo } from 'react';
import { useSync } from '../../contexts/SyncContext.jsx';
import { Notice } from '../ui/Notice.jsx';

export function SyncProgress({ onClose }) {
  const { syncProgress, syncResults } = useSync();

  const title = useMemo(() => {
    switch (syncProgress?.operation?.entity) {
      case 'types':
        return 'Types';
        break;
      case 'ingredients':
        return 'Ingrédients';
        break;
      case 'recipes':
        return 'Recettes';
        break;
      case 'export':
        return 'Export des Recettes';
        break;
      case 'import':
        return 'Import des Recettes';
        break;
      default:
        return 'Synchronisation des Données';
    }
  }, [syncProgress]);

  return (
    <>
      {(syncProgress?.operation?.entity || syncProgress?.operation?.step) &&
        <Notice title={title} message={syncProgress?.operation?.step} icon={UpdateIcon} type="neutral" />
      }
      {(syncResults) && (
        syncResults.error ? (
          <>
            <Notice type="error" title="Erreur de synchronisation"
              message={syncResults.error} >
              <Flex gap="2">
                <Button variant="surface" onClick={onClose}>Terminer</Button>
              </Flex>
            </Notice>
          </>
        ) : (
          <>
            {
              syncResults.totalFailed > 0 ? (
                <>
                  {syncResults.totalSuccess > 0 ? (
                    <Notice type="warning" title="Synchronisation partiellement réussie"
                      message={`Certaines entités n'ont pas pu être synchronisées. (${syncResults.totalSuccess || 0} synchronisées, ${syncResults?.totalFailed || 0} échouées)`}
                    >
                      <div>
                        <Button variant="surface" onClick={onClose}>Terminer</Button>
                      </div>
                    </Notice>
                  ) : (
                    <Notice type="error" title="Échec de la synchronisation"
                      message="Aucune entité n'a pu être synchronisée." >
                      <div>
                        <Button variant="surface" onClick={onClose}>Terminer</Button>
                      </div>
                    </Notice>
                  )}
                </>
              ) : (
                <Notice type="success" title="Synchronisation terminée"
                  message="Vos recettes ont été synchronisées avec succès." >
                  <div>
                    <Button variant="surface" onClick={onClose}>Terminer</Button>
                  </div>
                </Notice>
              )
            }
          </>
        )
      )
      }

    </>
  )
}