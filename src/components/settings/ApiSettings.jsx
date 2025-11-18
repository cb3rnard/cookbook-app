import { Button, Flex, Heading, Spinner, TextField } from '@radix-ui/themes';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApi } from '../../contexts/ApiContext.jsx';
import { useSettings } from '../../contexts/SettingsContext.jsx';
import { Notice } from '../ui/Notice.jsx';

export function ApiSettings({ }) {
  const {
    checkConnectivity,
    userSession,
    connection,
    connectionStatus,
    login,
    logout
  } = useApi();
  const { getApiCredentialsSettings } = useSettings();

  const [isConnecting, setIsConnecting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [credentials, setCredentials] = useState({
    apiUrl: '',
    apiUser: '',
    apiPassword: ''
  });

  const isDisabled = useMemo(() => (userSession.isActive && !connection.isDisconnected) || false, [userSession.isActive, connection.isDisconnected]);

  // Initialisation des paramètres de l'API et vérification de la connectivité
  useEffect(() => {
    const init = async () => {
      const newCredentials = { ...credentials };
      if(userSession.isActive) {
        newCredentials.apiUrl = userSession.apiUrl || '';
        newCredentials.apiUser = (userSession.user && userSession.user.email) ? userSession.user.email : '';
      } else {
        const { savedApiUrl: apiUrl, savedApiUser: apiUser } = await getApiCredentialsSettings();
        newCredentials.apiUrl = apiUrl || '';
        newCredentials.apiUser = apiUser || '';
      }
      setCredentials(newCredentials);
    };
    init();
  }, [userSession.isActive]);

  const handleInput = useCallback((e) => {
    if (isDisabled) {
      return;
    }
    const { name, value } = e.target;

    setCredentials((prev) => {
      return ({ ...prev, [name]: value })
    });
  }, [isDisabled]);

  const handleApiSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (isDisabled) {
      return;
    }

    setNotice(null);

    if (credentials.apiUrl && credentials.apiUser && credentials.apiPassword) {
      setIsConnecting(true);
      try {
        const successful = await login(credentials.apiUrl, credentials.apiUser, credentials.apiPassword);
        if (successful) {
          setNotice({
            type: 'success',
            title: 'Connexion à l\'API réussie',
            message: 'Connecté avec succès.'
          });
          setTimeout(() => {
            setNotice(null);
          }, 3000);
          // Réinitialiser le mot de passe
          setCredentials(prev => ({ ...prev, apiPassword: '' }));
        }
      } catch (error) {
        setNotice({
          type: 'error',
          title: 'Échec de la connexion à l\'API',
          message: error.message
        });
      } finally {
        setIsConnecting(false);
      }
    }
  }, [credentials, isDisabled]);

  const handleApiLogout = async (e) => {
    e.preventDefault();
    await logout();
  };

  const connectionNotice = useMemo(() => {
    if (isConnecting) {
      return (
        <Notice
          type="info"
          title="Connexion en cours..."
          message="Veuillez patienter pendant que nous tentons de nous connecter à l'API."
        />
      );
    } else {
      switch (connectionStatus) {
        case 'offline':
          return (
            <Notice
              type="error"
              title="Hors ligne"
              message="L'application est hors ligne."
            />
          );
        case 'unavailable':
          return (
            <Notice
              type="warning"
              title="Serveur indisponible"
              message="Le serveur API n'est pas accessible."
            />
          );
        case 'available':
          return (
            <Notice
              type="info"
              title="Connexion possible"
              message="Vous pouvez vous connecter à l'API."
            />
          );
        case 'connected':
          return (
            <Notice
              type="success"
              title="Connecté"
              message="Vous êtes connecté à l'API."
            />
          );
        case 'disconnected':
          return (
            <Notice
              type="error"
              title="Déconnecté"
              message="Vous avez été déconnecté de l'API. Tentez de vous de vous reconnecter."
            />
          );
        case 'error':
          return (
            <Notice
              type="error"
              title="Erreur de connexion"
              message="Une erreur s'est produite lors de la connexion à l'API."
            />
          );
        default:
          return null;
      }
    }
  }, [isConnecting, connectionStatus]);

  return (
    <Flex className="settings__panel" direction="column" gap="6">
      <Heading as="h2">
        API Distante
      </Heading>
      <Flex direction="column" gap="4">
        {connectionNotice}
        <form onSubmit={handleApiSubmit} className="settings__form" style={{ position: 'relative' }}>
          <Flex direction="column" gap="3" justify={'start'}>
            {(isConnecting) &&
              <div className="settings__connecting" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Spinner size="3" />
              </div>
            }
            <fieldset style={(isConnecting) ? { opacity: 0.5 } : {}}>
              <legend><Heading as="h3" size="2">Authentification</Heading></legend>
              <Flex direction={"column"} gap="2">
                <div>
                  <label htmlFor="apiUrl" className="label">URL de l'API</label>
                  <TextField.Root
                    type="text"
                    id="apiUrl"
                    name="apiUrl"
                    disabled={isDisabled}
                    value={credentials.apiUrl}
                    placeholder="https://api.example.com"
                    onChange={handleInput}
                  />
                </div>
                <div>
                  <label htmlFor="apiUser" className="label">Email</label>
                  <TextField.Root
                    type="email"
                    id="apiUser"
                    name="apiUser"
                    disabled={isDisabled}
                    value={credentials.apiUser}
                    onChange={handleInput}
                  />
                </div>
                {!isDisabled && (
                  <div>
                    <label htmlFor="apiPassword" className='label'>Mot de passe</label>
                    <TextField.Root
                      type="password"
                      id="apiPassword"
                      name="apiPassword"
                      disabled={isDisabled}
                      value={credentials.apiPassword}
                      onChange={handleInput}
                    />
                  </div>
                )}
              </Flex>
            </fieldset>
            <Flex gap="2">
              {(!userSession.isActive || connection.isDisconnected) && (
                <Button
                  type="submit"
                  disabled={isConnecting}
                  onClick={handleApiSubmit}
                >
                  {connection.isDisconnected ? 'Reconnexion' : 'Connexion'}
                </Button>
              )}
              {(userSession.isActive) && (
                <Button
                  variant="surface"
                  disabled={isConnecting}
                  onClick={handleApiLogout}
                >
                  Déconnexion de l'API
                </Button>
              )}
            </Flex>
          </Flex>
        </form>
      </Flex>
    </Flex>
  );
}