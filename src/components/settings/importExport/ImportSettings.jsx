import { DownloadIcon } from '@radix-ui/react-icons';
import { Button, Flex, Heading, Text } from '@radix-ui/themes';
import { useData } from '../../../contexts/DataContext';
import { useSync } from '../../../contexts/SyncContext';

export function ImportSettings({ setCurrentView, ...props }) {
  const { setError } = useSync();
  const { localCounts } = useData();

  const handleImport = async (overwrite = false) => {
    setError(null);
    try {
      // A faire
      console.log('-- IMPORT : A FAIRE', overwrite);
      await refreshEntitiesSyncStatus();
    } catch (err) {
      setError('Erreur d\'import : ' + err.message);
    } finally {
    }
  };

  return (
    <Flex gap="3" direction="column" {...props}>
      <Heading as="h3" size="4">Importer</Heading>
      <Text as="p">Importez vos recettes depuis un fichier ou une source externe.</Text>
      <Flex direction="column" gap="2" align={"start"}>
        <Flex gap="2">
          <Button onClick={() => handleImport(false)}>
            Importer
          </Button>
          {localCounts.all > 0 && (
            <Button variant="surface" color="red" onClick={() => handleImport(true)}>
              <DownloadIcon /> Réinitialiser et importer
            </Button>
          )}
        </Flex>
        <Button variant="surface" onClick={setCurrentView}>Annuler</Button>
      </Flex>
    </Flex >
  );
}