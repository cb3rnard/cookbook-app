import { createContext, useContext, useEffect, useState } from 'react';
import { ApiService } from '../services/api/ApiService';
import { EventBus } from '../services/utils/EventBus.js';
import { useView } from './ViewContext';

const ApiContext = createContext();

export function ApiProvider({ children }) {
  const [apiService] = useState(() => ApiService.getInstance());
  const [isInitialized, setIsInitialized] = useState(false);

  // États de connexion
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isApiOnline, setIsApiOnline] = useState(true); // Optimiste par défaut

  // États reflétant ApiService
  const [apiUrl, setApiUrl] = useState(apiService.apiUrl);
  const [userSession, setUserSession] = useState(apiService.userSession);

  // États de statut
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [connection, setConnection] = useState(apiService.connectionStatus); // 🚀 Sera synchronisé à l'init
  const [isValidating, setIsValidating] = useState(false);

  const { addNotice } = useView();

  // Initialisation unique au montage
  useEffect(() => {
    const initialize = async () => {
      try {
        await apiService.init();

        // Synchroniser tous les états
        setApiUrl(apiService.apiUrl);
        setUserSession(apiService.userSession);
        setIsInitialized(true);

      } catch (error) {
        setConnectionStatus('error');
      }
    };
    initialize();
  }, [apiService]);
  
  useEffect(() => {
    const eventBus = EventBus.getInstance();
    
    const handleApiStatusChange = (eventData) => {
      if (eventData.service === 'apiService') {
        setConnectionStatus(eventData.connectionStatus.status);
        setConnection(eventData.connectionStatus);
      }
    };
    
    eventBus.on('api:statusChange', handleApiStatusChange);
    
    return () => {
      eventBus.off('api:statusChange', handleApiStatusChange);
    };
  }, []);

  const checkConnectivity = async () => {
    try{
      await apiService.checkConnection();
    } catch (error) {
      console.error('Error checking connectivity:', error);
    }
  };

  // Événements de connectivité
  // useEffect(() => {
  //   if (!isInitialized) return;

  //   const handleOnline = () => {
  //     setIsOnline(true);
  //     // Check quand la connexion revient - utiliser les valeurs actuelles d'apiService
  //     if (apiService.apiUrl) {
  //       // checkConnectivity();
  //     }
  //   };

  //   const handleOffline = () => {
  //     setIsOnline(false);
  //     setIsApiOnline(false);
  //     setConnectionStatus('offline');
  //   };

  //   const handleFocus = () => {
  //     // Vérifier seulement si on était offline ou en erreur
  //     if (connectionStatus === 'offline' || connectionStatus === 'api_offline' || connectionStatus === 'error') {
  //       checkConnectivity();
  //     }
  //   };

  //   window.addEventListener('online', handleOnline);
  //   window.addEventListener('offline', handleOffline);
  //   window.addEventListener('focus', handleFocus);

  //   return () => {
  //     window.removeEventListener('online', handleOnline);
  //     window.removeEventListener('offline', handleOffline);
  //     window.removeEventListener('focus', handleFocus);
  //   };
  // }, [isInitialized, apiUrl, connectionStatus]);

    
  // Notifications selon le statut
  useEffect(() => {
    if (!connectionStatus) return;
    
    switch (connectionStatus) {
      case 'offline':
        addNotice({
          type: 'error',
          title: 'Hors ligne',
          message: "L'application est hors ligne.",
          duration: 5000,
          opaque: true
        });
        break;
      case 'available':
        addNotice({
          type: 'info',
          title: 'Serveur disponible',
          message: "Le serveur API est accessible.",
          duration: 5000,
          opaque: true
        });
        break;
      case 'unavailable':
        addNotice({
          type: 'warning',
          title: 'Serveur indisponible',
          message: "Le serveur API n'est pas accessible.",
          duration: 5000,
          opaque: true
        });
        break;
      case 'error':
        addNotice({
          type: 'error',
          title: 'Erreur de connexion',
          message: "Une erreur s'est produite lors de la connexion à l'API.",
          duration: 5000,
          opaque: true
        });
        break;
      case 'authenticated':
        // Masquer les notifications d'erreur quand on se reconnecte
        addNotice({
          type: 'success',
          title: 'Connexion rétablie',
          message: "La connexion au serveur est rétablie.",
          duration: 3000,
          opaque: true
        });
        break;
      case 'unauthenticated':
        addNotice({
          type: 'warning',
          title: 'Non authentifié',
          message: "Vous n'êtes pas authentifié.",
          duration: 5000,
          opaque: true
        });
        break;
      case 'disconnected':
        addNotice({
          type: 'error',
          title: 'Déconnexion',
          message: "Vous avez été déconnecté.",
          duration: 5000,
          opaque: true
        });
        break;
    }
  }, [connectionStatus, addNotice]);

  const login = async (apiUrl = null, email = null, password = null) => {
    try {
      await apiService.login(apiUrl, email, password);
      setUserSession(apiService.userSession);
    } catch (error) {
      setUserSession({});
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
      setUserSession({});
    } catch (error) {
    }
  };

  const value = {
    // États
    isInitialized,
    isOnline,
    isApiOnline,
    userSession,
    connection,
    connectionStatus,
    isValidating,
    apiUrl,

    // Méthodes
    checkConnectivity,

    login,
    logout
  };

  return (
    <ApiContext.Provider value={value}>
      {children}
    </ApiContext.Provider>
  );
};

export function useApi() {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};