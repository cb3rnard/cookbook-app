import { Box, Tabs } from '@radix-ui/themes';
import { ApiOptionsPanel } from '../options/ApiOptionsPanel';
import { DevOptionsPanel } from '../options/DevOptionsPanel';
import { EntitiesOptionsPanel } from '../options/EntitiesOptionsPanel';
import { GlobalOptionsPanel } from '../options/GlobalOptionsPanel';
import { ImportExportOptionsPanel } from '../options/ImportExportOptionsPanel';
import { SyncOptionsPanel } from '../options/SyncOptionsPanel';
import styles from './OptionsView.module.css';

export function OptionsView() {
  const sessionState = {
    isActive: true,
  };

  return (
    <Box height="100%" maxWidth="100%">
      <Tabs.Root className={styles.tabs} defaultValue="main">
        <Tabs.List className={styles.tabsList}>
          <Tabs.Trigger value="main">Global</Tabs.Trigger>
          <Tabs.Trigger value="entities">Entités</Tabs.Trigger>
          <Tabs.Trigger value="api">API</Tabs.Trigger>
          {sessionState.isActive && (
            <Tabs.Trigger value="sync">Synchronisation</Tabs.Trigger>
          )}
          <Tabs.Trigger value="import-export">Import/Export</Tabs.Trigger>
          <Tabs.Trigger value="debug">Dev options</Tabs.Trigger>
        </Tabs.List>
        <Box p="3" className={styles.tabsContents}>
          <Tabs.Content value="main">
            <GlobalOptionsPanel />
          </Tabs.Content>
          <Tabs.Content value="entities">
            <EntitiesOptionsPanel />
          </Tabs.Content>
          <Tabs.Content value="api">
            <ApiOptionsPanel />
          </Tabs.Content>
          {sessionState.isActive && (
            <Tabs.Content value="sync">
              <SyncOptionsPanel />
            </Tabs.Content>
          )}
          <Tabs.Content value="import-export">
            <ImportExportOptionsPanel />
          </Tabs.Content>
          <Tabs.Content value="debug">
            <DevOptionsPanel />
          </Tabs.Content>
        </Box>
      </Tabs.Root>
    </Box>
  );
}
