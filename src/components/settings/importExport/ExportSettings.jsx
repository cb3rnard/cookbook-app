import { DownloadIcon } from '@radix-ui/react-icons';
import { Button, Flex, Heading, Text } from '@radix-ui/themes';

export function ExportSettings({ setCurrentView, ...props }) {
  const handleExport = async () => {
    // A FAIRE
    try {

    } catch (err) {
    } finally {
    }
  };

  return (
    <Flex gap="3" direction="column" {...props}>
      <Heading as="h3" size="4">Exporter</Heading>
      <Text as="p">Exportez vos recettes vers un fichier.</Text>
      <Flex direction="column" gap="2" align={"start"}>
        <Flex gap="2">
          <Button onClick={() => handleExport()}>
            <DownloadIcon /> Exporter
          </Button>
        </Flex>
        <Button variant="surface" onClick={setCurrentView}>Annuler</Button>
      </Flex>
    </Flex>
  );
}