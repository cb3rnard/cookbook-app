import { Box, Flex, Spinner } from '@radix-ui/themes';
import { Suspense } from 'react';

/**
 * Wrapper pour les composants lazy avec Suspense
 */
export const LazyWrapper = ({
  fallback = <Box asChild p="3" maxWidth="20rem">
    <Flex gap="2" align="center"><Spinner />Chargement...</Flex>
  </Box>,
  children }) => {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
};
