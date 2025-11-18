import { DetailedCountBox } from '@components/ui/DetailedCountBox';
import { Notice } from '@components/ui/Notice';
import { Box, Flex } from '@radix-ui/themes';

export const SyncCountBoxes = (props) => {
  const { local, remote } = props;

  return (
    <>
      {local.loading ? (
        <Notice type="info" title="Chargement..." message="Récupération des données de synchronisation en cours..." />
      ) : (
        <Flex direction={{ initial: 'column', xs: 'row' }} gap="3">
          <Box flexShrink="1" flexBasis="50%" asChild>
            {local.error ? (
              <Notice type="error" title={local.error.title} message={local.error.message} />
            ) : (
              <DetailedCountBox type="local" counts={local} />
            )}
          </Box>
          <Box flexShrink="1" flexBasis="50%" asChild>
            {remote.error ? (
              <Notice type="error" title={remote.error.title} message={remote.error.message} />
            ) : (
              <DetailedCountBox type="remote" counts={remote} />
            )}
          </Box>
        </Flex>
      )}
    </>
  );
};