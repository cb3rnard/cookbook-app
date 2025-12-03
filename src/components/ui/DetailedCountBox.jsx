import { CheckCircledIcon } from "@radix-ui/react-icons";
import { Em, Flex, Heading, Separator, Text } from "@radix-ui/themes";
import { useMemo } from "react";
import { Notice } from "../ui/Notice";
import { LoadingWrapper } from "./LoadingWrapper";

export function DetailedCountBox({ type, counts, ...props }) {
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
        type: "warning",
        title: "Serveur indisponible",
        message: "Le serveur API n'est pas accessible.",
      };
    }
    if (counts.error) {
      return {
        type: "error",
        title: counts.error.title,
        message: counts.error.message,
      };
    }
    if (counts.hasChanges) {
      return {
        type: "warning",
        title: type === "local" ? "Données locales" : "Données distantes",
      };
    }
    if (empty) {
      return {
        type: "neutral",
        title: type === "local" ? "Données locales" : "Données distantes",
      };
    }
    return {
      type: "info",
      title: type === "local" ? "Données locales" : "Données distantes",
    };
  }, [counts, empty, type]);

  return (
    <Flex flexGrow="1" flexShrink="1" flexBasis="50%" {...props}>
      <LoadingWrapper isLoading={counts.loading} width="100%" height="100%">
        <Notice variant="surface" {...noticeProps} width="100%" height="100%">
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
                    </Heading>
                  </Flex>
                  {(counts.modified.recipes > 0 ||
                    counts.deleted.recipes > 0) && (
                    <Text as="p" size="1">
                      <Em>{counts.modified.recipes} modifiées</Em>
                      {counts.deleted.recipes > 0 &&
                        `, ${counts.deleted.recipes} supprimées`}
                    </Text>
                  )}
                </div>
                <Flex gap="4">
                  <div>
                    <Flex gap="1" align="center">
                      <Text size="3" weight="bold">
                        {counts?.all.ingredients || 0}
                      </Text>
                      <Heading as="h4" size="1">
                        Ingrédients
                      </Heading>
                    </Flex>
                    {(counts.modified.ingredients > 0 ||
                      counts.deleted.ingredients > 0) && (
                      <Text as="p" size="1">
                        <Em>{counts.modified.ingredients} modifiés</Em>
                        {counts.deleted.ingredients > 0 &&
                          `, ${counts.deleted.ingredients} supprimés`}
                      </Text>
                    )}
                  </div>
                  <div>
                    <Flex gap="1" align="center">
                      <Text size="3" weight="bold">
                        {counts.all.types || 0}
                      </Text>
                      <Heading as="h4" size="1">
                        Types
                      </Heading>
                    </Flex>
                    {(counts.modified.types > 0 ||
                      counts.deleted.types > 0) && (
                      <Text as="p" size="1">
                        <Em>{counts.modified.types} modifiés</Em>
                        {counts.deleted.types > 0 &&
                          `, ${counts.deleted.types} supprimés`}
                      </Text>
                    )}
                  </div>
                </Flex>
              </Flex>
              {counts.hasChanges ? (
                <>
                  <Separator size="4" />
                  <Text as="div" size="1" color="orange" weight="bold">
                    Des modifications{" "}
                    {type === "local" ? "locales" : "distantes"} n'ont pas été
                    synchronisées.
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
            </>
          )}
        </Notice>
      </LoadingWrapper>
    </Flex>
  );
}
