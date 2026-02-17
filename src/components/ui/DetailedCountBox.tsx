import {
  CheckCircledIcon,
  CircleBackslashIcon,
  PlusCircledIcon,
  TrashIcon,
  UpdateIcon,
} from '@radix-ui/react-icons';
import { Box, Em, Flex, Heading, Text } from '@radix-ui/themes';
import { config, CONFIG_CONSTANTS } from '@src/config/config.ts';
import { useCallback, useMemo } from 'react';
import { CountsModel } from '../../types/data.ts';
import styles from './DetailedCountBox.module.css';
import { LoadingWrapper } from './LoadingWrapper';
import { Notice } from './Notice';

export function DetailedCountBox({
  type,
  counts,
  ...props
}: {
  type: 'local' | 'remote';
  counts: CountsModel;
} & React.HTMLAttributes<HTMLDivElement>) {
  const empty = useMemo(
    () =>
      !counts ||
      (counts.all.recipes === 0 &&
        counts.all.ingredients === 0 &&
        counts.all.types === 0),
    [counts],
  );

  const noticeProps = useMemo(() => {
    if (!counts.available) {
      return {
        type: CONFIG_CONSTANTS.NOTICE_TYPES.WARNING,
        title: 'Serveur indisponible',
        message: "Le serveur API n'est pas accessible.",
      };
    }
    if (counts.error) {
      return {
        type: CONFIG_CONSTANTS.NOTICE_TYPES.ERROR,
        title: counts.error.title,
        message: counts.error.message,
      };
    }
    if (counts.hasChanges) {
      return {
        type: CONFIG_CONSTANTS.NOTICE_TYPES.WARNING,
        title: type === 'local' ? 'Données locales' : 'Données distantes',
        IconComponent: UpdateIcon,
      };
    }
    if (empty) {
      return {
        type: CONFIG_CONSTANTS.NOTICE_TYPES.NEUTRAL,
        title: type === 'local' ? 'Données locales' : 'Données distantes',
        IconComponent: CircleBackslashIcon,
      };
    }
    return {
      type: CONFIG_CONSTANTS.NOTICE_TYPES.INFO,
      title: type === 'local' ? 'Données locales' : 'Données distantes',
      IconComponent: CheckCircledIcon,
    };
  }, [counts, empty, type]);

  const ChangesNotice = useCallback(
    () =>
      counts.hasChanges ? (
        <Notice
          title="Changements"
          type="warning"
          IconComponent={UpdateIcon}
          className={styles.back}
        >
          <Flex direction="column">
            {config.ENDPOINTS_SYNCABLE.map((endpoint) =>
              counts.created[endpoint] > 0 ||
              counts.modified[endpoint] > 0 ||
              counts.deleted[endpoint] > 0 ? (
                <Box key={endpoint} mb="2">
                  <Heading as="h4" size="1" mb="1">
                    {endpoint.charAt(0).toUpperCase() + endpoint.slice(1)}
                  </Heading>
                  <Flex gap="1">
                    {counts.created[endpoint] > 0 && (
                      <Flex gap="1">
                        <PlusCircledIcon />
                        <Text as="div" size="1">
                          <Em>
                            {counts.created[endpoint]} nouveau
                            {counts.created[endpoint] > 1 ? 'x' : ''}
                          </Em>
                        </Text>
                      </Flex>
                    )}
                    {counts.modified[endpoint] > 0 && (
                      <Flex gap="1">
                        <UpdateIcon />
                        <Text as="div" size="1">
                          <Em>
                            {counts.modified[endpoint]} modifié
                            {counts.modified[endpoint] > 1 ? 's' : ''}
                          </Em>
                        </Text>
                      </Flex>
                    )}
                    {counts.deleted[endpoint] > 0 && (
                      <Flex gap="1">
                        <TrashIcon />
                        <Text as="div" size="1">
                          <Em>
                            {counts.deleted[endpoint]} supprimé
                            {counts.deleted[endpoint] > 1 ? 's' : ''}
                          </Em>
                        </Text>
                      </Flex>
                    )}
                  </Flex>
                </Box>
              ) : null,
            )}
          </Flex>
        </Notice>
      ) : null,
    [counts],
  );

  return (
    <Box
      flexGrow="1"
      flexShrink="1"
      flexBasis="50%"
      {...props}
      className={counts.hasChanges ? styles.hasChanges : undefined}
    >
      <Box asChild width="100%" height="100%">
        <LoadingWrapper isLoading={counts.loading}>
          <Box asChild className={styles.front} width="100%" height="100%">
            <Notice {...noticeProps}>
              {counts.available && !counts.error && (
                <>
                  <Flex direction="column" gap="2">
                    <div>
                      <Flex gap="2" align="center">
                        <Text size="4" weight="bold">
                          {counts.all.recipes || 0}
                        </Text>
                        <Heading as="h4" size="2">
                          Recettes
                          {counts.modified.recipes > 0 ||
                          counts.deleted.recipes > 0 ||
                          counts.created.recipes > 0
                            ? '*'
                            : ''}
                        </Heading>
                      </Flex>
                    </div>
                    <Flex gap="4">
                      <div>
                        <Flex gap="1" align="center">
                          <Text size="3" weight="bold">
                            {counts?.all.ingredients || 0}
                          </Text>
                          <Heading as="h4" size="1">
                            Ingrédients
                            {counts.modified.ingredients > 0 ||
                            counts.deleted.ingredients > 0 ||
                            counts.created.ingredients > 0
                              ? '*'
                              : ''}
                          </Heading>
                        </Flex>
                      </div>
                      <div>
                        <Flex gap="1" align="center">
                          <Text size="3" weight="bold">
                            {counts.all.types || 0}
                          </Text>
                          <Heading as="h4" size="1">
                            Types
                            {counts.modified.types > 0 ||
                            counts.deleted.types > 0 ||
                            counts.created.types > 0
                              ? '*'
                              : ''}
                          </Heading>
                        </Flex>
                      </div>
                    </Flex>
                  </Flex>
                  <Box>
                    {counts.hasChanges ? (
                      <Text as="div" size="1" weight="bold">
                        Des changements{' '}
                        {type === 'local' ? 'locaux' : 'distants'} n'ont pas été
                        synchronisés.
                      </Text>
                    ) : empty ? (
                      <Flex gap="2" align="center">
                        <Text as="div" size="1" weight="bold">
                          Aucune donnée. Synchronisez depuis un serveur ou
                          ajoutez vos recettes localement.
                        </Text>
                      </Flex>
                    ) : (
                      <Flex gap="2" align="center">
                        <Text as="div" size="1" weight="bold">
                          Toutes les données sont synchronisées.
                        </Text>
                      </Flex>
                    )}
                  </Box>
                </>
              )}
            </Notice>
          </Box>
          {counts.hasChanges && <ChangesNotice />}
        </LoadingWrapper>
      </Box>
    </Box>
  );
}
