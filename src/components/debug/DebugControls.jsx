import { Box, Card, Flex, Switch, Text } from '@radix-ui/themes';
import { useState } from 'react';
import { DebugService } from '../../services/DebugService';
import styles from './DebugControls.module.css';

/**
 * Composant de contrôles debug pour le header
 * Affiche des switches pour activer/désactiver le debug par contexte
 */
export function DebugControls() {
  const [debugStates, setDebugStates] = useState({
    global: false,
    api: false,
    storage: false,
    sync: false,
    component: false,
    entity: false
  });

  const handleGlobalToggle = (enabled) => {
    if (enabled) {
      DebugService.enableGlobalDebug();
    } else {
      DebugService.disableGlobalDebug();
    }
    setDebugStates(prev => ({ ...prev, global: enabled }));
  };

  const handleContextToggle = (context, enabled) => {
    if (enabled) {
      DebugService.enableContext(context);
    } else {
      DebugService.disableContext(context);
    }
    setDebugStates(prev => ({ ...prev, [context]: enabled }));
  };

  return (
    <Card className={styles.debugControls} size="1">
      <Text size="2" weight="bold" className={styles.title}>
        Debug Controls
      </Text>

      <Flex direction="column" gap="2" className={styles.switches}>
        {/* Debug Global */}
        <Flex align="center" justify="between" className={styles.switchRow}>
          <Text size="1" weight="medium">🌍 Global</Text>
          <Switch
            checked={debugStates.global}
            onCheckedChange={handleGlobalToggle}
            size="1"
          />
        </Flex>

        {/* Séparateur */}
        {debugStates.global && (
          <Box className={styles.separator} />
        )}

        {/* Contextes individuels (seulement si global désactivé) */}
        {!debugStates.global && (
          <>
            <Flex align="center" justify="between" className={styles.switchRow}>
              <Text size="1">🌐 API</Text>
              <Switch
                checked={debugStates.api}
                onCheckedChange={(enabled) => handleContextToggle('api', enabled)}
                size="1"
              />
            </Flex>

            <Flex align="center" justify="between" className={styles.switchRow}>
              <Text size="1">💾 Storage</Text>
              <Switch
                checked={debugStates.storage}
                onCheckedChange={(enabled) => handleContextToggle('storage', enabled)}
                size="1"
              />
            </Flex>

            <Flex align="center" justify="between" className={styles.switchRow}>
              <Text size="1">🔄 Sync</Text>
              <Switch
                checked={debugStates.sync}
                onCheckedChange={(enabled) => handleContextToggle('sync', enabled)}
                size="1"
              />
            </Flex>

            <Flex align="center" justify="between" className={styles.switchRow}>
              <Text size="1">🧩 Components</Text>
              <Switch
                checked={debugStates.component}
                onCheckedChange={(enabled) => handleContextToggle('component', enabled)}
                size="1"
              />
            </Flex>

            <Flex align="center" justify="between" className={styles.switchRow}>
              <Text size="1">📦 Entities</Text>
              <Switch
                checked={debugStates.entity}
                onCheckedChange={(enabled) => handleContextToggle('entity', enabled)}
                size="1"
              />
            </Flex>
          </>
        )}
      </Flex>

      {/* Info */}
      <Text size="1" className={styles.info}>
        {debugStates.global
          ? '🟢 Tous les logs sont activés'
          : (() => {
            const activeCount = Object.entries(debugStates)
              .filter(([key, value]) => key !== 'global' && value === true)
              .length;
            return `🟡 ${activeCount} contexte(s) activé(s)`;
          })()
        }
      </Text>
    </Card>
  );
};