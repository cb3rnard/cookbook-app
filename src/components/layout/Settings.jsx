import { Box, Tabs } from "@radix-ui/themes";
import { ApiSettings } from "../settings/ApiSettings";
import { DebugSettings } from "../settings/DebugSettings";
import { EntitiesSettings } from "../settings/EntitiesSettings";
import { GlobalSettings } from "../settings/GlobalSettings";
import { ImportExportSettings } from "../settings/ImportExportSettings";
import { ResetSettings } from "../settings/ResetSettings";
import { SyncSettings } from "../settings/SyncSettings";
import styles from "./Settings.module.css";

export function Settings() {
  // const { sessionState } = useApi();
  const sessionState = {
    isActive: true,
  };

  return (
    <Box height="100%" maxWidth="100%">
      <Tabs.Root className={styles.tabs} defaultValue="main">
        <Tabs.List className={styles.tabsList}>
          <Tabs.Trigger value="main">Options</Tabs.Trigger>
          <Tabs.Trigger value="entities">Entités</Tabs.Trigger>
          <Tabs.Trigger value="api">API</Tabs.Trigger>
          {sessionState.isActive && (
            <Tabs.Trigger value="sync">Synchronisation</Tabs.Trigger>
          )}
          <Tabs.Trigger value="import-export">Import/Export</Tabs.Trigger>
          <Tabs.Trigger value="debug">Debug</Tabs.Trigger>
          <Tabs.Trigger value="reset">Reset</Tabs.Trigger>
        </Tabs.List>
        <Box p="3" className={styles.tabsContents}>
          <Tabs.Content value="main">
            <GlobalSettings />
          </Tabs.Content>
          <Tabs.Content value="entities">
            <EntitiesSettings />
          </Tabs.Content>
          <Tabs.Content value="api">
            <ApiSettings />
          </Tabs.Content>
          {sessionState.isActive && (
            <Tabs.Content value="sync">
              <SyncSettings />
            </Tabs.Content>
          )}
          <Tabs.Content value="import-export">
            <ImportExportSettings />
          </Tabs.Content>
          <Tabs.Content value="debug">
            <DebugSettings />
          </Tabs.Content>
          <Tabs.Content value="reset">
            <ResetSettings />
          </Tabs.Content>
        </Box>
      </Tabs.Root>
    </Box>
  );
}
