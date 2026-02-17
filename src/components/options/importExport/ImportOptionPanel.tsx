import { DownloadIcon } from '@radix-ui/react-icons';
import { Button, Flex, Heading, Text } from '@radix-ui/themes';
import { useData } from '../../../contexts/DataContext';

export function ImportOptionsPanel({
  setCurrentView,
  ...props
}: {
  setCurrentView: React.Dispatch<React.SetStateAction<string>>;
} & React.HTMLAttributes<HTMLDivElement>) {
  const { localCounts } = useData();

  const globalLocalCount = Object.values(localCounts.all).reduce(
    (sum, count) => sum + count,
    0,
  );

  const handleImport = async (overwrite = false) => {
    try {
      // A FAIRE
      console.log('-- IMPORT : A FAIRE', overwrite);
    } catch (error) {
      console.error("Erreur lors de l'import :", error);
    }
  };

  return (
    <Flex gap="3" direction="column" {...props}>
      <Heading as="h3" size="4">
        Importer
      </Heading>
      <Text as="p">
        Importez vos recettes depuis un fichier ou une source externe.
      </Text>
      <Flex direction="column" gap="2" align={'start'}>
        <Flex gap="2">
          <Button onClick={() => handleImport(false)}>Importer</Button>
          {globalLocalCount > 0 && (
            <Button
              variant="surface"
              color="red"
              onClick={() => handleImport(true)}
            >
              <DownloadIcon /> Réinitialiser et importer
            </Button>
          )}
        </Flex>
        <Button variant="surface" onClick={() => setCurrentView('')}>
          Annuler
        </Button>
      </Flex>
    </Flex>
  );
}
