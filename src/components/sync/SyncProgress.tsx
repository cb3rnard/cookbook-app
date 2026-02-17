import {
  CheckIcon,
  CrossCircledIcon,
  InfoCircledIcon,
  UpdateIcon,
} from '@radix-ui/react-icons';
import { Badge, Box, Button, Flex, Heading, Text } from '@radix-ui/themes';
import { useMemo } from 'react';
import { useSync } from '../../contexts/SyncContext.jsx';
import { Notice } from '../ui/Notice.js';

export function SyncProgress({ onClose }: { onClose: () => void }) {
  const { syncState } = useSync();
  const { operation } = syncState;
  const { endpoints, totals } = operation;

  const title = useMemo(() => {
    switch (operation.step.entity) {
      case 'types':
        return 'Types';
      case 'ingredients':
        return 'Ingrédients';
      case 'recipes':
        return 'Recettes';
      default:
        return 'Synchronisation des Données';
    }
  }, [operation.step.entity]);

  const endpointLabels = {
    types: 'Types',
    ingredients: 'Ingrédients',
    recipes: 'Recettes',
  };

  const Summary = useMemo(() => {
    if (!endpoints || endpoints.size === 0 || !operation.completed) {
      return null;
    }

    return (
      <Box style={{ marginTop: '1rem' }}>
        <Heading as="h4" size="3" mb="3">
          Résumé de la synchronisation
        </Heading>

        {/* Global totals */}
        <Flex gap="2" mb="4" wrap="wrap">
          <Badge color="green" size="2">
            <CheckIcon /> {totals.imported} importées
          </Badge>
          <Badge color="blue" size="2">
            <CheckIcon /> {totals.exported} exportées
          </Badge>
          {totals.failed > 0 && (
            <Badge color="red" size="2">
              <CrossCircledIcon /> {totals.failed} échecs
            </Badge>
          )}
          {totals.conflicts > 0 && (
            <Badge color="orange" size="2">
              <InfoCircledIcon /> {totals.conflicts} conflits
            </Badge>
          )}
          {totals.criticalErrors > 0 && (
            <Badge color="crimson" size="2">
              <CrossCircledIcon /> {totals.criticalErrors} erreurs critiques
            </Badge>
          )}
        </Flex>

        {/* Per-endpoint details */}
        {Array.from(endpoints.entries()).map(([endpoint, state]) => {
          const hasData = state.toImport > 0 || state.toExport > 0;
          const hasCriticalError = state.criticalError !== '';

          if (!hasData && !hasCriticalError) return null;

          return (
            <Box
              key={endpoint}
              mb="3"
              p="3"
              style={{
                border: '1px solid var(--gray-6)',
                borderRadius: 'var(--radius-2)',
              }}
            >
              <Heading as="h5" size="2" mb="2">
                {endpointLabels[endpoint] || endpoint}
              </Heading>

              {hasCriticalError ? (
                <Notice
                  title="Erreur critique"
                  type="error"
                  message={state.criticalError}
                />
              ) : (
                <Flex direction="column" gap="2">
                  {state.toImport > 0 && (
                    <Flex gap="2" align="center">
                      <Text size="2" weight="medium">
                        Import :
                      </Text>
                      <Badge color="green">
                        {state.import.success}/{state.toImport}
                      </Badge>
                      {state.import.failed > 0 && (
                        <Badge color="red">{state.import.failed} échecs</Badge>
                      )}
                    </Flex>
                  )}

                  {state.toExport > 0 && (
                    <Flex gap="2" align="center">
                      <Text size="2" weight="medium">
                        Export :
                      </Text>
                      <Badge color="blue">
                        {state.export.success}/{state.toExport}
                      </Badge>
                      {state.export.failed > 0 && (
                        <Badge color="red">{state.export.failed} échecs</Badge>
                      )}
                    </Flex>
                  )}

                  {state.conflicts.length > 0 && (
                    <Flex gap="2" align="center">
                      <Text size="2" weight="medium">
                        Conflits :
                      </Text>
                      <Badge color="orange">{state.conflicts.length}</Badge>
                    </Flex>
                  )}

                  {/* Show errors if any */}
                  {(state.import.errors.length > 0 ||
                    state.export.errors.length > 0) && (
                    <Box mt="2">
                      <Text size="1" color="red">
                        {[...state.import.errors, ...state.export.errors]
                          .slice(0, 3)
                          .join(', ')}
                        {state.import.errors.length +
                          state.export.errors.length >
                          3 && '...'}
                      </Text>
                    </Box>
                  )}
                </Flex>
              )}
            </Box>
          );
        })}
      </Box>
    );
  }, [endpoints, operation.completed, totals]);

  const SyncStatusNotice = () => {
    if (!operation.completed) return null;

    // const hasErrors = totals.errors > 0 || totals.criticalErrors > 0;
    const hasFailed = totals.failed > 0;
    const hasSuccess = totals.imported > 0 || totals.exported > 0;

    // Critical errors or all failed
    if (totals.criticalErrors > 0 || (hasFailed && !hasSuccess)) {
      return (
        <Notice
          type="error"
          title="Échec de la synchronisation"
          message={
            totals.criticalErrors > 0
              ? `${totals.criticalErrors} endpoint(s) n'ont pas pu être synchronisés.`
              : "Aucune entité n'a pu être synchronisée."
          }
        >
          <Flex gap="2" mt="3" direction="column">
            {Summary}
            <Button variant="surface" onClick={onClose}>
              Fermer
            </Button>
          </Flex>
        </Notice>
      );
    }

    // Partial success
    if (hasFailed && hasSuccess) {
      return (
        <Notice
          type="warning"
          title="Synchronisation partiellement réussie"
          message={`${totals.imported + totals.exported} entités synchronisées, ${totals.failed} échecs.`}
        >
          <Flex gap="2" mt="3" direction="column">
            {Summary}
            <Button variant="surface" onClick={onClose}>
              Fermer
            </Button>
          </Flex>
        </Notice>
      );
    }

    // Full success
    if (hasSuccess) {
      const totalSynced = totals.imported + totals.exported;
      return (
        <Notice
          type="success"
          title="Synchronisation réussie"
          message={`${totalSynced} entité(s) synchronisée(s) avec succès.`}
        >
          <Flex gap="2" mt="3" direction="column">
            {Summary}
            <Button variant="surface" onClick={onClose}>
              Fermer
            </Button>
          </Flex>
        </Notice>
      );
    }

    // Nothing to sync
    return (
      <Notice
        type="info"
        title="Rien à synchroniser"
        message="Aucune modification détectée."
      >
        <Flex gap="2" mt="3">
          <Button variant="surface" onClick={onClose}>
            Fermer
          </Button>
        </Flex>
      </Notice>
    );
  };

  return (
    <>
      <Heading as="h5" size="2" mb="3">
        {syncState.syncing
          ? 'Synchronisation en cours...'
          : operation.completed
            ? 'Synchronisation terminée'
            : 'Aucune synchronisation en cours'}
      </Heading>

      {syncState.syncing &&
        (operation.step.entity || operation.step.action) && (
          <Notice
            title={title}
            message={operation.step.action}
            IconComponent={UpdateIcon}
            type="neutral"
          />
        )}

      <SyncStatusNotice />
    </>
  );
}
