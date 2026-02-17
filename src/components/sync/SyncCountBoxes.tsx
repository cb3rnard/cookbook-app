import { Flex } from '@radix-ui/themes';
import { CountsModel } from '@src/types/data';
import { useApi } from '../../contexts/ApiContext';
import { DetailedCountBox } from '../ui/DetailedCountBox';
import { Notice } from '../ui/Notice';

export const SyncCountBoxes = ({
  local,
  remote,
}: {
  local: CountsModel;
  remote: CountsModel;
}) => {
  const { session } = useApi();

  return (
    <Flex direction={{ initial: 'column', xs: 'row' }} gap="3">
      <Flex flexShrink="1" flexBasis="50%" asChild>
        <DetailedCountBox type="local" counts={local} />
      </Flex>
      <Flex flexShrink="1" flexBasis="50%" asChild align="stretch">
        {session.active ? (
          <DetailedCountBox type="remote" counts={remote} />
        ) : (
          <Notice
            variant="surface"
            type="neutral"
            title="Synchronisation inactive"
            message="Aucune session de synchronisation active. Connectez-vous à l'API pour voir les données distantes."
            width="100%"
            height="100%"
          />
        )}
      </Flex>
    </Flex>
  );
};
