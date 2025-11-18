import { createContext, useCallback, useContext, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const ViewContext = createContext();

export const ViewProvider = ({ children }) => {
  // État des notices/toasts
  const [notices, setNotices] = useState([]);
  // État des modals/popups (pour les vraies popups: confirmations, etc.)
  const [modals, setModals] = useState([]);
  // État des overlay views (pour les vues métier: recipe, settings, etc.)
  const [currentOverlayView, setCurrentOverlayView] = useState(null);
  // Deprecated - à supprimer progressivement
  const [currentView, setCurrentView] = useState(null);

  // État global de l'UI
  const [uiState, setUiState] = useState({
    sidebarOpen: false,
    hasModal: false,
    loading: false,
    theme: 'light'
  });


  // Gestion des notices
  const addNotice = useCallback((notice) => {
    const id = uuidv4();
    const newNotice = {
      id,
      type: 'info',
      title: '',
      message: '',
      duration: 5000,
      ...notice
    };

    setNotices(prev => [...prev, newNotice]);

    // Auto-dismiss si duration > 0
    if (newNotice.duration > 0) {
      setTimeout(() => {
        removeNotice(id);
      }, newNotice.duration);
    }

    return id;
  }, []);

  const removeNotice = useCallback((id) => {
    setNotices(prev => prev.filter(notice => notice.id !== id));
  }, []);

  const clearNotices = useCallback(() => {
    setNotices([]);
  }, []);

  // Gestion des modals
  /**
   * Ouvre un nouveau modal
   * @param {string|null} id - ID du modal (généré si null)
   * @param {object} modal - Contenu et props du modal
   */
  const openModal = useCallback((id = null, modal) => {
    if (!id) {
      id = uuidv4();
    }
    const newModal = {
      id,
      props: {},
      ...modal
    };

    setModals(prev => [...prev, newModal]);
    return id;
  }, []);

  const updateModal = useCallback((id, updates) => {
    setModals(prev => prev.map(modal =>
      modal.id === id ? { ...modal, ...updates } : modal
    ));
  }, []);

  const closeModal = useCallback((id) => {
    setModals(prev => prev.filter(modal => modal.id !== id));
  }, []);

  const closeTopModal = useCallback(() => {
    setModals(prev => prev.slice(0, -1));
  }, []);

  const clearModals = useCallback(() => {
    setModals([]);
  }, []);

  // ==================== OVERLAY VIEWS HELPERS ====================

  const openRecipeForm = useCallback((recipeUuid = null) => {
    setCurrentOverlayView({
      type: 'recipe',
      mode: 'edit',
      props: { recipeUuid },
    });
  }, []);

  const openRecipeView = useCallback((recipeUuid) => {
    setCurrentOverlayView({
      type: 'recipe',
      mode: 'view',
      props: { recipeUuid },
      maxWidth: '40rem',
    });
  }, []);

  const openUrlImport = useCallback(() => {
    setCurrentOverlayView({
      type: 'import',
      mode: 'form',
      unstyledContent: true,
    });
  }, []);

  const openSettings = useCallback(() => {
    setCurrentOverlayView({
      type: 'settings',
      mode: 'main',
      maxWidth: '40rem',
    });
  }, []);

  // Méthodes de convenance pour les notices
  const showSuccess = useCallback((message, options = {}) => {
    return addNotice({
      type: 'success',
      message,
      title: 'Succès',
      ...options
    });
  }, [addNotice]);

  const showError = useCallback((message, options = {}) => {
    return addNotice({
      type: 'error',
      message,
      title: 'Erreur',
      duration: 8000, // Plus long pour les erreurs
      ...options
    });
  }, [addNotice]);

  const showWarning = useCallback((message, options = {}) => {
    return addNotice({
      type: 'warning',
      message,
      title: 'Attention',
      ...options
    });
  }, [addNotice]);

  const showInfo = useCallback((message, options = {}) => {
    return addNotice({
      type: 'info',
      message,
      ...options
    });
  }, [addNotice]);

  // Gestion de l'état UI global
  const updateUiState = useCallback((updates) => {
    setUiState(prev => ({ ...prev, ...updates }));
  }, []);

  const toggleSidebar = useCallback(() => {
    setUiState(prev => ({ ...prev, sidebarOpen: !prev.sidebarOpen }));
  }, []);

  const setLoading = useCallback((loading) => {
    setUiState(prev => ({ ...prev, loading }));
  }, []);

  const value = {
    // État
    notices,
    modals,
    uiState,
    currentView,

    // Gestion des notices
    addNotice,
    removeNotice,
    clearNotices,
    showSuccess,
    showError,
    showWarning,
    showInfo,

    // Gestion des modals
    openModal,
    updateModal,
    closeModal,
    closeTopModal,
    clearModals,

    // Gestion UI globale
    updateUiState,
    toggleSidebar,
    setCurrentView, // Deprecated
    setLoading,

    // Gestion des overlay views
    currentOverlayView,
    setCurrentOverlayView,
    openRecipeForm,
    openRecipeView,
    openUrlImport,
    openSettings,
  };

  return (
    <ViewContext.Provider value={value}>
      {children}
    </ViewContext.Provider>
  );
};

export const useView = () => {
  const context = useContext(ViewContext);
  if (!context) {
    throw new Error('useView must be used within a ViewProvider');
  }
  return context;
};