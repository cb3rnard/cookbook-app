import { Box, Card, Flex, Spinner, Text } from '@radix-ui/themes';
import { BoxProps } from '@radix-ui/themes/src/components/box.tsx';
import styled from 'styled-components';

const StyledCard = styled(Card)`
  background-color: var(--iris-a7);
  color: var(--iris-a11);
`;

const StyledText = styled(Text)`
  font-weight: 500;
  text-transform: uppercase;
`;

export const LoadingIndicator = ({
  children = <StyledText as="span">Chargement...</StyledText>,
  ...props
}: { children?: React.ReactNode } & BoxProps) => {
  return (
    <Box asChild {...props}>
      <StyledCard>
        <Flex direction="column" align="center" justify="center" gap="2">
          <Spinner />
          {children}
        </Flex>
      </StyledCard>
    </Box>
  );
};
