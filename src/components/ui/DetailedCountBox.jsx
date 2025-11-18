import { Notice } from '@components/ui/Notice';
import { CheckCircledIcon } from '@radix-ui/react-icons';
import { Box, Em, Flex, Heading, Separator, Text } from '@radix-ui/themes';
import { useMemo } from 'react';
import { LoadingWrapper } from './LoadingWrapper';

export function DetailedCountBox(props) {
  const { type, counts } = props; // 'local' ou 'remote'
  const empty = useMemo(() => !counts || (counts.all.Recipes === 0 && counts.all.ingredients === 0 && counts.all.types === 0), [counts]);

  return (
    <Box asChild flexGrow="1" flexShrink="1" flexBasis="50%">
      <LoadingWrapper isLoading={counts.loading}>
        <Box flexGrow="1" flexShrink="1" flexBasis="50%">
          <Notice variant="surface" type={counts.hasChanges ? 'warning' : (empty ? 'neutral' : 'info')} title={type === 'local' ? 'Données locales' : 'Données distantes'} style={{ height: '100%' }} >
            <Flex direction="column" gap="2">
              <div>
                <Flex gap="2" align="center">
                  <Text size="4" weight="bold">{counts.all.recipes || 0}</Text>
                  <Heading as="h4" size="2">
                    Recettes
                  </Heading>
                </Flex>
                {counts.dirty.recipes > 0 &&
                  <Text as="p" size="1">
                    <Em>
                      {counts.dirty.recipes} modifiées
                    </Em>
                  </Text>
                }
              </div>
              <Flex gap="4">
                <div>
                  <Flex gap="1" align="center">
                    <Text size="3" weight="bold">{counts?.all.ingredients || 0}</Text>
                    <Heading as="h4" size="1">
                      Ingrédients
                    </Heading>
                  </Flex>
                  {counts?.dirty.ingredients > 0 &&
                    <Text as="p" size="1">
                      <Em>
                        {counts.dirty.ingredients} modifiés
                      </Em>
                    </Text>
                  }
                </div>
                <div>
                  <Flex gap="1" align="center">
                    <Text size="3" weight="bold">{counts.all.types || 0}</Text>
                    <Heading as="h4" size="1">
                      Types
                    </Heading>
                  </Flex>
                  {counts.dirty.types > 0 &&
                    <Text as="p" size="1">
                      <Em>
                        {counts.dirty.types} modifiés
                      </Em>
                    </Text>
                  }
                </div>
              </Flex>
            </Flex>
            {counts.hasChanges ? (
              <>
                <Separator size="4" />
                <Text as="div" size="1" color="orange" weight="bold">
                  Des modifications {type === 'local' ? 'locales' : 'distantes'} n'ont pas été synchronisées.
                </Text>
              </>
            ) : (
              <>
                {!empty && (
                  <>
                    <Separator size="4" />
                    <Flex gap="2" align="center">
                      <CheckCircledIcon />
                      <Text as="div" size="1" weight="bold">
                        Toutes les données sont synchronisées.
                      </Text>
                    </Flex>
                  </>
                )}
              </>
            )}
          </Notice>
        </Box >
      </LoadingWrapper>
    </Box >
  );
}