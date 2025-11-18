import { Card, Flex, Spinner, Text } from '@radix-ui/themes';
import styled from 'styled-components';

const StyledCard = styled(Card)`
  background-color: var(--iris-a7);
  color: var(--iris-a11);
`;

const StyledText = styled(Text)`
  font-weight: 500;
  text-transform: uppercase
`;

export const LoadingIndicator = ({ children = <StyledText as="span" >Chargement...</StyledText>, ...props }) => {
  return (
    <StyledCard {...props}>
      <Flex direction="column" align="center" justify="center" gap="2">
        <Spinner color="inherit" />
        {children}
      </Flex>
    </StyledCard>
  );
};