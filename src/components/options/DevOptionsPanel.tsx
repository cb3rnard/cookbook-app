import { TrashIcon } from '@radix-ui/react-icons';
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Switch,
  Text,
} from '@radix-ui/themes';
import { EventBus } from '@src/services/utils/EventBus';
import { useEffect, useState } from 'react';
import { config } from '../../config/config';
import { ConfigService } from '../../services/ConfigService';
import { DebugService } from '../../services/DebugService';
import { storageDatabase as database } from '../../services/StorageService';

interface DebugStates {
  global: boolean;
  showDebugControls: boolean;
  [key: string]: boolean;
}

export function DevOptionsPanel() {
  const [debugStates, setDebugStates] = useState<DebugStates>({
    global: false,
    showDebugControls: false,
  });
  const [activeContexts, setActiveContexts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Contextes de debug disponibles
  const availableContexts = [
    {
      key: 'default',
      label: 'Par défaut',
      description: 'Messages généraux et logs non catégorisés',
    },
    {
      key: 'api',
      label: 'Appels API',
      description: 'Requêtes, réponses et erreurs API',
    },
    {
      key: 'storage',
      label: 'Stockage',
      description: 'Opérations de base de données locale',
    },
    {
      key: 'sync',
      label: 'Synchronisation',
      description: 'Processus de synchronisation des données',
    },
    {
      key: 'component',
      label: 'Composants',
      description: 'Composants UI et interactions',
    },
  ];

  useEffect(() => {
    loadDebugSettings();
  }, []);

  const loadDebugSettings = () => {
    try {
      setLoading(true);

      // Charger les états depuis config
      const states: DebugStates = {
        global: config.debugGlobal || false,
        showDebugControls: config.showDebugControls || false,
      };

      availableContexts.forEach((context) => {
        const configKey = `debug${context.key.charAt(0).toUpperCase()}${context.key.slice(1)}`;
        states[context.key] =
          ((config as Record<string, unknown>)[configKey] as boolean) || false;
      });

      setDebugStates(states);
      setActiveContexts(DebugService.getActiveContexts());
    } catch (error) {
      console.error('Erreur lors du chargement des settings debug:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalDebugChange = async (enabled: boolean) => {
    try {
      await ConfigService.set('debugGlobal', enabled);
      setDebugStates((prev) => ({ ...prev, global: enabled }));
      setActiveContexts(DebugService.getActiveContexts());

      if (enabled) {
        DebugService.info('Debug global activé', 'api');
      }
    } catch (error) {
      console.error('Erreur lors de la modification du debug global:', error);
    }
  };

  const handleContextDebugChange = async (
    context: string,
    enabled: boolean,
  ) => {
    try {
      const configKey = `debug${context.charAt(0).toUpperCase()}${context.slice(1)}`;
      await ConfigService.set(configKey, enabled);
      setDebugStates((prev) => ({ ...prev, [context]: enabled }));
      setActiveContexts(DebugService.getActiveContexts());

      if (enabled) {
        DebugService.info(`Debug activé pour le contexte: ${context}`, context);
      }
    } catch (error) {
      console.error(
        `Erreur lors de la modification du debug ${context}:`,
        error,
      );
    }
  };

  const handleTestDebug = (context: string) => {
    DebugService.debug(
      `🧪 Test de debug pour le contexte: ${context}`,
      context,
    );
    DebugService.info(`ℹ️ Message d'information pour ${context}`, context);
    DebugService.warn(`⚠️ Message d'avertissement pour ${context}`, context);
    DebugService.error(`❌ Message d'erreur pour ${context}`, context);
  };

  const handleShowDebugControlsChange = async (enabled: boolean) => {
    try {
      await ConfigService.set('showDebugControls', enabled);
      setDebugStates((prev) => ({ ...prev, showDebugControls: enabled }));
    } catch (error) {
      console.error('Erreur lors de la modification showDebugControls:', error);
    }
  };

  const handleClearConsole = () => {
    console.clear();
  };

  const deleteAllData = async () => {
    if (
      !window.confirm(
        'Êtes-vous sûr de vouloir supprimer toutes les données ? Cette action est irréversible.',
      )
    ) {
      return;
    }

    const eventBus = EventBus.getInstance();
    eventBus.emit('app:clear');

    database.delete({ disableAutoOpen: false });
  };

  if (loading) {
    return <Text>Chargement des paramètres de debug...</Text>;
  }

  return (
    <Box>
      <Flex direction="column" gap="4">
        <Box>
          <Heading size="5" mb="3">
            Paramètres de Debug
          </Heading>
          <Text size="2" color="gray">
            Configurez les logs de debug pour diagnostiquer les problèmes de
            l&apos;application.
          </Text>
        </Box>

        {/* Affichage des contrôles debug */}
        <Card>
          <Flex justify="between" align="center">
            <Flex direction="column" gap="1">
              <Text weight="medium">🎛️ Afficher les contrôles de debug</Text>
              <Text size="2" color="gray">
                Affiche les contrôles debug dans le header pour
                activer/désactiver les logs en temps réel
              </Text>
            </Flex>
            <Switch
              checked={debugStates.showDebugControls || false}
              onCheckedChange={handleShowDebugControlsChange}
            />
          </Flex>
        </Card>

        {/* Debug Global */}
        <Card>
          <Flex justify="between" align="center">
            <Flex direction="column" gap="1">
              <Text weight="medium">🌍 Debug Global</Text>
              <Text size="2" color="gray">
                Active tous les logs de debug de l&apos;application
              </Text>
            </Flex>
            <Switch
              checked={debugStates.global || false}
              onCheckedChange={handleGlobalDebugChange}
            />
          </Flex>
        </Card>

        {/* Contextes spécifiques */}
        <Box>
          <Heading size="4" mb="3">
            Debug par contexte
          </Heading>
          <Flex direction="column" gap="2">
            {availableContexts.map((context) => (
              <Card key={context.key}>
                <Flex justify="between" align="center" gap="3">
                  <Box flexGrow="1">
                    <Flex justify="between" align="center" mb="1">
                      <Text weight="medium">{context.label}</Text>
                      <Button
                        size="1"
                        variant="ghost"
                        onClick={() => handleTestDebug(context.key)}
                      >
                        Test
                      </Button>
                    </Flex>
                    <Text size="2" color="gray">
                      {context.description}
                    </Text>
                  </Box>
                  <Switch
                    checked={debugStates[context.key] || false}
                    onCheckedChange={(enabled) =>
                      handleContextDebugChange(context.key, enabled)
                    }
                    disabled={debugStates.global}
                  />
                </Flex>
              </Card>
            ))}
          </Flex>
        </Box>

        {/* Informations */}
        <Card>
          <Box>
            <Text weight="medium" mb="2">
              Contextes actifs
            </Text>
            {activeContexts.length > 0 ? (
              <Flex wrap="wrap" gap="1">
                {activeContexts.map((context) => (
                  <Box
                    key={context}
                    asChild
                    px="2"
                    py="1"
                    style={{
                      backgroundColor: 'var(--accent-3)',
                      borderRadius: 'var(--radius-2)',
                      fontSize: 'var(--font-size-1)',
                    }}
                  >
                    <Text>{context}</Text>
                  </Box>
                ))}
              </Flex>
            ) : (
              <Text size="2" color="gray">
                Aucun contexte de debug actif
              </Text>
            )}
          </Box>
        </Card>

        {/* Actions */}
        <Card>
          <Flex gap="2">
            <Button variant="outline" onClick={handleClearConsole}>
              Nettoyer la console
            </Button>
            <Button variant="outline" onClick={() => handleTestDebug('api')}>
              Test global
            </Button>
          </Flex>
        </Card>
        <Box>
          <Heading size="4" mt="6" mb="2" color="red">
            Reset
          </Heading>
          <Text size="2" color="gray" mb="2">
            Supprime toutes les données de l&apos;application. Cette action est
            irréversible.
          </Text>
          <Button variant="surface" color="red" onClick={deleteAllData}>
            <TrashIcon /> Supprimer toutes les données
          </Button>
        </Box>
      </Flex>
    </Box>
  );
}
