import { Box, Button, Card, Flex, Heading, Switch, Text } from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import { DebugService, SettingsService } from '../../services';

export function DebugSettings() {
  const [debugSettings, setDebugSettings] = useState({});
  const [activeContexts, setActiveContexts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDebugControls, setShowDebugControls] = useState(false);

  // Contextes de debug disponibles
  const availableContexts = [
    { key: 'api', label: 'Appels API', description: 'Requêtes, réponses et erreurs API' },
    { key: 'sync', label: 'Synchronisation', description: 'Processus de synchronisation des données' },
    { key: 'storage', label: 'Stockage', description: 'Opérations de base de données locale' },
    { key: 'entity', label: 'Entités', description: 'Création, modification des entités' },
    { key: 'auth', label: 'Authentification', description: 'Connexion et gestion des sessions' },
    { key: 'form', label: 'Formulaires', description: 'Validation et soumission des formulaires' }
  ];

  useEffect(() => {
    loadDebugSettings();
  }, []);

  const loadDebugSettings = async () => {
    try {
      setLoading(true);
      const settings = await SettingsService.getSettings();
      const contexts = DebugService.getActiveContexts();

      // Extraire les settings de debug
      const debugData = {
        debug: settings.debug || false,
        showDebugControls: settings.showDebugControls || false
      };

      availableContexts.forEach(context => {
        const key = `debug-${context.key}`;
        debugData[key] = settings[key] || false;
      });

      setDebugSettings(debugData);
      setActiveContexts(contexts);
      setShowDebugControls(settings.showDebugControls || false);
    } catch (error) {
      console.error('Erreur lors du chargement des settings debug:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalDebugChange = async (enabled) => {
    try {
      await SettingsService.setSetting('debug', enabled);
      setDebugSettings(prev => ({ ...prev, debug: enabled }));

      if (enabled) {
        DebugService.debug('Debug global activé', 'debug');
      }

      // Recharger les contextes actifs
      const contexts = DebugService.getActiveContexts();
      setActiveContexts(contexts);
    } catch (error) {
      console.error('Erreur lors de la modification du debug global:', error);
    }
  };

  const handleContextDebugChange = async (context, enabled) => {
    try {
      const key = `debug-${context}`;
      await SettingsService.setSetting(key, enabled);
      setDebugSettings(prev => ({ ...prev, [key]: enabled }));

      if (enabled) {
        DebugService.debug(`Debug activé pour le contexte: ${context}`, context);
      }

      // Recharger les contextes actifs
      const contexts = DebugService.getActiveContexts();
      setActiveContexts(contexts);
    } catch (error) {
      console.error(`Erreur lors de la modification du debug ${context}:`, error);
    }
  };

  const handleTestDebug = (context) => {
    DebugService.debug(`🧪 Test de debug pour le contexte: ${context}`, context);
    DebugService.info(`ℹ️ Message d'information pour ${context}`, context);
    DebugService.warn(`⚠️ Message d'avertissement pour ${context}`, context);
    DebugService.error(`❌ Message d'erreur pour ${context}`, context);
  };

  const handleShowDebugControlsChange = async (enabled) => {
    try {
      await SettingsService.setSetting('showDebugControls', enabled);
      setShowDebugControls(enabled);
      setDebugSettings(prev => ({ ...prev, showDebugControls: enabled }));
    } catch (error) {
      console.error('Erreur lors de la modification showDebugControls:', error);
    }
  };

  const handleClearConsole = () => {
    console.clear();
  };

  if (loading) {
    return <Text>Chargement des paramètres de console...</Text>;
  }

  return (
    <Box>
      <Flex direction="column" gap="4">
        <Box>
          <Heading size="5" mb="3">Paramètres de Debug</Heading>
          <Text size="2" color="gray">
            Configurez les logs de debug pour diagnostiquer les problèmes de l'application.
          </Text>
        </Box>

        {/* Affichage des contrôles debug */}
        <Card>
          <Flex justify="between" align="center">
            <Flex direction="column" gap="1">
              <Text weight="medium">🎛️ Afficher les boutons de debug</Text>
              <Text size="2" color="gray">
                Affiche les contrôles debug dans le header pour activer/désactiver les logs en temps réel
              </Text>
            </Flex>
            <Switch
              checked={showDebugControls}
              onCheckedChange={handleShowDebugControlsChange}
            />
          </Flex>
        </Card>

        {/* Debug Global */}
        <Card>
          <Flex justify="between" align="center">
            <Flex direction="column" gap="1">
              <Text weight="medium">Debug Global</Text>
              <Text size="2" color="gray">
                Active tous les logs de debug de l'application
              </Text>
            </Flex>
            <Switch
              checked={debugSettings.debug || false}
              onCheckedChange={handleGlobalDebugChange}
            />
          </Flex>
        </Card>

        {/* Contextes spécifiques */}
        <Box>
          <Heading size="4" mb="3">Debug par contexte</Heading>
          <Flex direction="column" gap="2">
            {availableContexts.map(context => (
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
                    checked={debugSettings[`debug-${context.key}`] || false}
                    onCheckedChange={(enabled) => handleContextDebugChange(context.key, enabled)}
                    disabled={debugSettings.debug} // Désactivé si debug global actif
                  />
                </Flex>
              </Card>
            ))}
          </Flex>
        </Box>

        {/* Informations */}
        <Card>
          <Box>
            <Text weight="medium" mb="2">Contextes actifs</Text>
            {activeContexts.length > 0 ? (
              <Flex wrap="wrap" gap="1">
                {activeContexts.map(context => (
                  <Box
                    key={context}
                    asChild
                    px="2"
                    py="1"
                    style={{
                      backgroundColor: 'var(--accent-3)',
                      borderRadius: 'var(--radius-2)',
                      fontSize: 'var(--font-size-1)'
                    }}
                  >
                    <Text>{context}</Text>
                  </Box>
                ))}
              </Flex>
            ) : (
              <Text size="2" color="gray">Aucun contexte de debug actif</Text>
            )}
          </Box>
        </Card>

        {/* Actions */}
        <Card>
          <Flex gap="2">
            <Button
              variant="outline"
              onClick={handleClearConsole}
            >
              Nettoyer la console
            </Button>
            <Button
              variant="outline"
              onClick={() => handleTestDebug('global')}
            >
              Test global
            </Button>
          </Flex>
        </Card>
      </Flex>
    </Box>
  );
};