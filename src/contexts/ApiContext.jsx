import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useObservableState } from "../hooks/useObservableState.js";
import { ApiService } from "../services/api/ApiService.js";
import { useView } from "./ViewContext";

const ApiContext = createContext();

export function ApiProvider({ children }) {
  const apiService = useMemo(() => {
    return new ApiService();
  }, []);

  const session = useObservableState(apiService.sessionStore);
  const connection = useObservableState(apiService.connectionStore);
  const { status, connecting } = connection;
  const [currentStatus, setCurrentStatus] = useState(status);

  const { addNotice } = useView();

  const checkConnectivity = useCallback(async () => {
    try {
      await apiService.checkConnection();
    } catch (error) {
      console.error("Error checking connectivity:", error);
    }
  }, [apiService]);

  // Check connectivity on first load
  useEffect(() => {
    const check = async () => {
      await checkConnectivity();
    };
    check();
  }, [checkConnectivity]);

  const toggleAutoSync = useCallback(() => {
    apiService.sessionStore.toggleAutoSync();
  }, [apiService]);

  // Online/offline events
  useEffect(() => {
    const handleOnline = () => {
      if (status === "online") return;
      checkConnectivity();
    };

    const handleOffline = () => {
      if (status === "offline") return;
      apiService.connectionStore.setOnline(false);
    };

    const handleFocus = () => {
      if (
        status === "offline" ||
        status === "unavailable" ||
        status === "error"
      ) {
        checkConnectivity();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("focus", handleFocus);
    };
  }, [status]);

  // Notifications selon le statut
  useEffect(() => {
    if (!status || connecting || status === currentStatus) return;
    setCurrentStatus(status);

    switch (status) {
      case "online":
        addNotice({
          type: "success",
          title: "En ligne",
          message: "L'application est en ligne.",
          duration: 3000,
          opaque: true,
        });
        break;
      case "offline":
        addNotice({
          type: "error",
          title: "Hors ligne",
          message: "L'application est hors ligne.",
          duration: 5000,
          opaque: true,
        });
        break;
      case "available":
        addNotice({
          type: "info",
          title: "Serveur disponible",
          message: "Le serveur API est accessible.",
          duration: 5000,
          opaque: true,
        });
        break;
      case "unavailable":
        addNotice({
          type: "warning",
          title: "Serveur indisponible",
          message: "Le serveur API n'est pas accessible.",
          duration: 5000,
          opaque: true,
        });
        break;
      case "error":
        addNotice({
          type: "error",
          title: "Erreur de connexion",
          message: "Une erreur s'est produite lors de la connexion à l'API.",
          duration: 5000,
          opaque: true,
        });
        break;
      case "authenticated":
        // Masquer les notifications d'erreur quand on se reconnecte
        addNotice({
          type: "success",
          title: "Connecté",
          message: "Vous êtes connecté à l'API.",
          duration: 3000,
          opaque: true,
        });
        break;
      case "unauthenticated":
        addNotice({
          type: "warning",
          title: "Non authentifié",
          message: "Vous n'êtes pas authentifié.",
          duration: 5000,
          opaque: true,
        });
        break;
      case "expired":
        addNotice({
          type: "error",
          title: "Session expirée",
          message: "Votre session a expiré. Veuillez vous reconnecter.",
          duration: 5000,
          opaque: true,
        });
        break;
      case "disconnected":
        addNotice({
          type: "error",
          title: "Déconnexion",
          message: "Vous êtes déconnecté de l'API.",
          duration: 5000,
          opaque: true,
        });
        break;
    }
  }, [status, connecting, addNotice]);

  const login = useCallback(
    async (apiUrl = null, email = null, password = null) => {
      return await apiService.operations.auth.login(apiUrl, email, password);
    },
    [apiService],
  );

  const logout = useCallback(async () => {
    await apiService.operations.auth.logout();
  }, [apiService]);

  const value = {
    // États
    session,
    connection,

    // Méthodes
    toggleAutoSync,
    checkConnectivity,

    login,
    logout,
  };

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApi() {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error("useApi must be used within an ApiProvider");
  }
  return context;
}
