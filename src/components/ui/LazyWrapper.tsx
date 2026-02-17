import { Box, Flex, Spinner } from '@radix-ui/themes';
import { Suspense } from 'react';

const DefaultFallback = () => (
  <Box asChild p="3" maxWidth="20rem">
    <Flex gap="2" align="center">
      <Spinner />
      Chargement...
    </Flex>
  </Box>
);
/**
 * Wrapper pour les composants lazy avec Suspense
 */
export const LazyWrapper = ({
  fallback = <DefaultFallback />,
  children,
}: {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) => {
  return <Suspense fallback={fallback}>{children}</Suspense>;
};
