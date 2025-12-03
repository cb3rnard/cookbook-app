import { UpdateIcon } from "@radix-ui/react-icons";
import { Button, Flex, Heading } from "@radix-ui/themes";
import { useEffect, useMemo } from "react";
import { useSync } from "../../contexts/SyncContext.jsx";
import { Notice } from "../ui/Notice.jsx";

export function SyncProgress({ onClose }) {
  const { syncState } = useSync();
  const { operation } = syncState;
  const { summary } = operation;
  const { results } = summary;

  const title = useMemo(() => {
    switch (operation.step.entity) {
      case "types":
        return "Types";
        break;
      case "ingredients":
        return "Ingrédients";
        break;
      case "recipes":
        return "Recettes";
        break;
      case "export":
        return "Export des Recettes";
        break;
      case "import":
        return "Import des Recettes";
        break;
      default:
        return "Synchronisation des Données";
    }
  }, [operation.step.entity]);

  useEffect(() => {
    // Errors
    console.log("Sync operation errors:", summary.errors);
  }, [summary.errors]);

  return (
    <>
      <Heading as="h5" size="2">
        {syncState.syncing
          ? "Synchronisation en cours..."
          : operation.completed
            ? "Synchronisation terminée"
            : "Aucune synchronisation en cours"}
      </Heading>
      {(operation.step.entity || operation.step.action) && (
        <Notice
          title={title}
          message={operation.step.action}
          icon={UpdateIcon}
          type="neutral"
        />
      )}
      {operation.completed &&
        (summary.errors.length > 0 ? (
          <>
            <Notice type="error" title="Erreur de synchronisation">
              <Flex gap="2">
                <Button variant="surface" onClick={onClose}>
                  Terminer
                </Button>
              </Flex>
            </Notice>
          </>
        ) : (
          <>
            {results.totalFailed > 0 ? (
              <>
                {results.totalSuccess > 0 ? (
                  <Notice
                    type="warning"
                    title="Synchronisation partiellement réussie"
                    message={`Certaines entités n'ont pas pu être synchronisées. (${results.totalSuccess || 0} synchronisées, ${results?.totalFailed || 0} échouées)`}
                  >
                    <div>
                      <Button variant="surface" onClick={onClose}>
                        Terminer
                      </Button>
                    </div>
                  </Notice>
                ) : (
                  <Notice
                    type="error"
                    title="Échec de la synchronisation"
                    message="Aucune entité n'a pu être synchronisée."
                  >
                    <div>
                      <Button variant="surface" onClick={onClose}>
                        Terminer
                      </Button>
                    </div>
                  </Notice>
                )}
              </>
            ) : (
              <Notice
                type="success"
                title="Synchronisation terminée"
                message="Vos recettes ont été synchronisées avec succès."
              >
                <div>
                  <Button variant="surface" onClick={onClose}>
                    Terminer
                  </Button>
                </div>
              </Notice>
            )}
          </>
        ))}
    </>
  );
}
