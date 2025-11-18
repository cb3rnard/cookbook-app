import { TrashIcon } from "@radix-ui/react-icons";
import { Button, Flex, Heading, Separator } from "@radix-ui/themes";
import { useSync } from "../../contexts";
import { database } from "../../services/StorageService";

export function ResetSettings({ onReset }) {
  const { resetSync, refreshEntitiesSyncStatus } = useSync();

  // Reset de l'état de synchronisation
  const resetSyncState = async () => {
    try {
      await resetSync();
      await refreshEntitiesSyncStatus();
    } catch (err) {
    }
  };

  const resetEntitiesSyncState = async (entityType) => {
    try {
      database.transaction('rw', database[entityType], async () => {
        await database[entityType].toCollection().modify(entity => {
          entity.isDirty = 1;
          entity.lastSyncDate = null;
          entity.version = 1;
        });
      });
      await refreshEntitiesSyncStatus();
    } catch (err) {
    }
  };

  const deleteAllData = async () => {
    // Ask for confirmation before deleting all data
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer toutes les données ? Cette action est irréversible.")) {
      return;
    }

    database.delete({ disableAutoOpen: false })
    localStorage.clear();
  }

  return (
    <Flex className="settings__panel" direction="column" gap="6">
      <Heading as="h2">
        Réinitialisation
      </Heading>
      <Flex direction="column" gap="2">
        <Button onClick={resetSyncState} variant="surface" color="red" >
          Réinitialiser l'état de synchronisation
        </Button>
        <Separator size="4" />
        <Button onClick={(e) => { resetEntitiesSyncState('recipes') }} variant="surface" color="red" >
          Reset sync (RECIPES)
        </Button>
        <Button onClick={(e) => { resetEntitiesSyncState('ingredients') }} variant="surface" color="red" >
          Reset sync (INGREDIENTS)
        </Button>
        <Button onClick={(e) => { resetEntitiesSyncState('types') }} variant="surface" color="red" >
          Reset sync (TYPES)
        </Button>
        <Separator size="4" />
        <Button
          className="btn btn--danger app-header__action"
          onClick={deleteAllData}
          size="4"
        >
          <TrashIcon /> Supprimer toutes les données
        </Button>
      </Flex>
    </Flex>
  );
};