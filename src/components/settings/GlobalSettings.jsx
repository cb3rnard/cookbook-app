import { CheckCircledIcon, CrossCircledIcon } from "@radix-ui/react-icons";
import { Card, Flex, Heading, Separator, Text } from "@radix-ui/themes";
import { useData } from "../../contexts";
import { useApi } from "../../contexts/ApiContext";
import { LoadingWrapper } from "../ui/LoadingWrapper";

export function GlobalSettings() {
  const { connection, session } = useApi();
  const { user } = session;
  const { autoSync } = session;
  const { apiUrl, authenticated, disconnected } = connection;
  const { localCounts } = useData();

  return (
    <Flex direction="column" gap="4">
      <Heading as="h2">Informations globales</Heading>
      <Card>
        <Flex direction="column" gap="3">
          {localCounts && (
            <>
              {localCounts.loading ? (
                <LoadingWrapper>Chargement des statistiques...</LoadingWrapper>
              ) : (
                <>
                  <Flex gap="2" align="center">
                    <Text weight="bold">Recettes :</Text>
                    <Text>{localCounts.all.recipes}</Text>
                  </Flex>
                  <Flex gap="2" align="center">
                    <Text weight="bold">Ingrédients :</Text>
                    <Text>{localCounts.all.ingredients}</Text>
                  </Flex>
                  <Flex gap="2" align="center">
                    <Text weight="bold">Types</Text>
                    <Text>{localCounts.all.types}</Text>
                  </Flex>
                </>
              )}
            </>
          )}
          <Separator />
          <Flex
            direction={{ initial: "column", xs: "row" }}
            gap="2"
            align={{ initial: "start", xs: "center" }}
          >
            <Text weight="bold">Connexion API :</Text>
            {authenticated ? (
              <Flex gap="1" align="center">
                <CheckCircledIcon color="green" />{" "}
                <Text color="green">Connecté</Text>
              </Flex>
            ) : disconnected ? (
              <Flex gap="1" align="center">
                <CrossCircledIcon color="red" />{" "}
                <Text color="red">Déconnecté</Text>
              </Flex>
            ) : (
              <Flex gap="1" align="center">
                <CrossCircledIcon color="red" />{" "}
                <Text color="red">Non connecté</Text>
              </Flex>
            )}
          </Flex>
          <Flex
            direction={{ initial: "column", xs: "row" }}
            gap="2"
            align={{ initial: "start", xs: "center" }}
          >
            <Text weight="bold">Synchronisation automatique :</Text>
            {autoSync ? (
              <Flex gap="1" align="center">
                <CheckCircledIcon color="green" />
                <Text color="green">Activée</Text>
              </Flex>
            ) : (
              <Flex gap="1" align="center">
                <CrossCircledIcon color="red" />
                <Text color="red">Désactivée</Text>
              </Flex>
            )}
          </Flex>
          <Flex
            direction={{ initial: "column", xs: "row" }}
            gap="2"
            align={{ initial: "start", xs: "center" }}
          >
            <Text weight="bold">Utilisateur :</Text>
            <Text>{user?.email || "Non connecté"}</Text>
          </Flex>
          <Flex
            direction={{ initial: "column", xs: "row" }}
            gap="2"
            align={{ initial: "start", xs: "center" }}
          >
            <Text weight="bold">URL API :</Text>
            <Text>{apiUrl || "-"}</Text>
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
}
