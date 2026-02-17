import { Button, Flex, Heading, Text, TextField } from '@radix-ui/themes';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApi } from '../../contexts/ApiContext.jsx';
import { useConfig } from '../../contexts/ConfigContext.jsx';
import { LoadingIndicator } from '../ui/LoadingIndicator.js';
import { Notice } from '../ui/Notice.js';

export function ApiOptionsPanel() {
  const { checkConnectivity, session, connection, login, logout } = useApi();
  const { connecting, status } = connection;
  const [currentStatus, setCurrentStatus] = useState(status);
  const [logging, setLogging] = useState(false);
  const { config } = useConfig();

  useEffect(() => {
    const check = async () => {
      if (!connecting) {
        await checkConnectivity();
      }
    };
    check();
  }, [checkConnectivity]);

  const [credentials, setCredentials] = useState({
    apiUrl: '',
    apiUser: '',
    apiPassword: '',
  });

  const isDisabled = useMemo(
    () => session.active && !connection.expired,
    [session.active, connection.expired],
  );

  const canLogin = useMemo(() => {
    return (
      credentials.apiUrl &&
      credentials.apiUser &&
      credentials.apiPassword &&
      !isDisabled
    );
  }, [credentials, isDisabled]);

  // Initialisation des paramètres de l'API et vérification de la connectivité
  useEffect(() => {
    const init = async () => {
      const newCredentials = { ...credentials };
      if (session.active) {
        newCredentials.apiUrl = session.apiUrl;
        newCredentials.apiUser = session.user.email;
      } else {
        const { apiUrl: savedApiUrl, apiUser: savedApiUser } = config;
        newCredentials.apiUrl = savedApiUrl || '';
        newCredentials.apiUser = savedApiUser || '';
      }
      setCredentials(newCredentials);
    };
    init();
  }, [session.active]);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isDisabled) {
        return;
      }
      const { name, value } = e.target;

      setCredentials((prev) => {
        return { ...prev, [name]: value };
      });
    },
    [isDisabled],
  );

  const handleApiSubmit = useCallback(
    async (
      e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>,
    ) => {
      e.preventDefault();
      if (!canLogin) {
        return;
      }
      setLogging(true);

      try {
        const successful = await login(
          credentials.apiUrl,
          credentials.apiUser,
          credentials.apiPassword,
        );
        if (successful) {
          // Réinitialiser le mot de passe
          setCredentials((prev) => ({ ...prev, apiPassword: '' }));
        }
      } catch (error) {
      } finally {
        setLogging(false);
      }
    },
    [canLogin, credentials, isDisabled],
  );

  const handleApiLogout = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    await logout();
  };

  useEffect(() => {
    if (!logging && !connecting) {
      setCurrentStatus(status);
    }
  }, [status, connecting, logging]);

  const connectionNotice = useMemo(() => {
    switch (currentStatus) {
      case 'offline':
        return (
          <Notice
            type="error"
            title="Hors ligne"
            message="Vous êtes hors ligne."
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
      case 'authenticated':
        return (
          <Notice
            type="success"
            title="Connecté"
            message="Vous êtes connecté à l'API."
          />
        );
      case 'expired':
        return (
          <Notice
            type="error"
            title="Déconnecté"
            message="Votre session a expiré. Veuillez vous reconnecter."
          />
        );
      case 'disconnected':
        return (
          <Notice
            type="error"
            title="Déconnecté"
            message="Vous êtes déconnecté de l'API."
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
  }, [currentStatus]);

  return (
    <Flex className="settings__panel" direction="column" gap="6">
      <Heading as="h2">API Distante</Heading>
      <Flex direction="column" gap="4">
        {connectionNotice}
        {logging && (
          <LoadingIndicator>
            <Text>Connexion à l'API...</Text>
          </LoadingIndicator>
        )}
        <form
          onSubmit={handleApiSubmit}
          className="settings__form"
          style={{ position: 'relative' }}
        >
          <Flex direction="column" gap="3" justify={'start'}>
            <fieldset style={logging ? { opacity: 0.5 } : {}}>
              <legend>
                <Heading as="h3" size="2">
                  Authentification
                </Heading>
              </legend>
              <Flex direction={'column'} gap="2">
                <div>
                  <label htmlFor="apiUrl" className="label">
                    URL de l'API
                  </label>
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
                  <label htmlFor="apiUser" className="label">
                    Email
                  </label>
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
                    <label htmlFor="apiPassword" className="label">
                      Mot de passe
                    </label>
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
              {(!session.active || connection.expired) && (
                <Button
                  type="submit"
                  disabled={logging || !canLogin}
                  onClick={handleApiSubmit}
                >
                  {connection.expired ? 'Reconnexion' : 'Connexion'}
                </Button>
              )}
              {session.active && (
                <Button
                  variant="surface"
                  disabled={logging}
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
