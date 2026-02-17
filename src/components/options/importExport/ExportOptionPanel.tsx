import { DownloadIcon } from '@radix-ui/react-icons';
import { Button, Flex, Heading, Text } from '@radix-ui/themes';

export function ExportOptionsPanel({
  setCurrentView,
  ...props
}: {
  setCurrentView: React.Dispatch<React.SetStateAction<string>>;
} & React.HTMLAttributes<HTMLDivElement>) {
  const handleExport = async () => {
    // A FAIRE
    try {
      // A FAIRE
      console.log('-- EXPORT : A FAIRE');
    } catch (error) {
      console.error("Erreur lors de l'export :", error);
    }
  };

  return (
    <Flex gap="3" direction="column" {...props}>
      <Heading as="h3" size="4">
        Exporter
      </Heading>
      <Text as="p">Exportez vos recettes vers un fichier.</Text>
      <Flex direction="column" gap="2" align={'start'}>
        <Flex gap="2">
          <Button onClick={() => handleExport()}>
            <DownloadIcon /> Exporter
          </Button>
        </Flex>
        <Button variant="surface" onClick={() => setCurrentView('')}>
          Annuler
        </Button>
      </Flex>
    </Flex>
  );
}
