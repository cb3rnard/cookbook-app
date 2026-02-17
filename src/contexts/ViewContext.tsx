import { ModalProps } from '@src/components/ui/Modal';
import { NoticeProps } from '@src/components/ui/Notice';
import { createContext, useCallback, useContext, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface OverlayViewProps {
  type: string;
  mode: string;
  props?: Record<string, any>;
  unstyledContent?: boolean;
  maxWidth?: string;
}

const defaultOverlayView: OverlayViewProps = {
  type: '',
  mode: '',
};

export interface UIState {
  sidebarOpen: boolean;
  hasModal: boolean;
  loading: boolean;
  theme: 'light' | 'dark';
}

export interface ViewContext {
  // État
  notices: NoticeProps[];
  modals: ModalProps[];
  uiState: UIState;
  currentOverlayView: OverlayViewProps;

  // Gestion des notices
  addNotice: (notice: NoticeProps, duration?: number) => void;
  removeNotice: (id: string) => void;
  clearNotices: () => void;
  // Gestion des modals
  openModal: (id: string, modal: Partial<ModalProps>) => string;
  updateModal: (
    id: string,
    updates: {
      title?: string;
      content?: React.ReactNode;
      props?: ModalProps;
    },
  ) => void;
  closeModal: (id: string) => void;
  closeTopModal: () => void;
  clearModals: () => void;

  // Gestion UI globale
  updateUiState: (
    updates: Partial<{
      sidebarOpen: boolean;
      hasModal: boolean;
      loading: boolean;
      theme: 'light' | 'dark';
    }>,
  ) => void;
  toggleSidebar: () => void;
  setLoading: (loading: boolean) => void;

  // Gestion des overlay views
  setCurrentOverlayView: (view: OverlayViewProps) => void;
  resetCurrentOverlayView: () => void;
  openRecipeForm: (recipeUuid?: string) => void;
  openRecipeView: (recipeUuid: string) => void;
  openUrlImport: () => void;
  openSettings: () => void;
}

const ViewContext = createContext<ViewContext | undefined>(undefined);

export const ViewProvider = ({ children }: { children: React.ReactNode }) => {
  // État des notices/toasts
  const [notices, setNotices] = useState<NoticeProps[]>([]);
  // État des modals/popups (pour les vraies popups: confirmations, etc.)
  const [modals, setModals] = useState<ModalProps[]>([]);
  // État des overlay views (pour les vues métier: recipe, settings, etc.)
  const [currentOverlayView, setCurrentOverlayView] =
    useState<OverlayViewProps>(defaultOverlayView);

  // État global de l'UI
  const [uiState, setUiState] = useState<UIState>({
    sidebarOpen: false,
    hasModal: false,
    loading: false,
    theme: 'light' as 'light' | 'dark',
  });

  // Gestion des notices
  const removeNotice = useCallback((id: string) => {
    setNotices((prev) => prev.filter((notice) => notice.id !== id));
  }, []);

  const addNotice = useCallback(
    (notice: NoticeProps, duration = 5000) => {
      const id = notice.id ?? uuidv4();
      const newNotice = {
        id,
        type: 'info',
        message: '',
        ...notice,
      } as NoticeProps;

      setNotices((prev) => [...prev, newNotice]);

      // Auto-dismiss si duration > 0
      if (duration > 0) {
        setTimeout(() => {
          removeNotice(id);
        }, duration);
      }
    },
    [removeNotice],
  );

  const clearNotices = useCallback(() => {
    setNotices([]);
  }, []);

  // Gestion des modals
  /**
   * Ouvre un nouveau modal
   * @param {string} id - ID du modal (généré si null)
   * @param {object} modal - Contenu et props du modal
   */
  const openModal = useCallback((id = '', modal: Partial<ModalProps>) => {
    if (!id) {
      id = uuidv4();
    }
    const newModal = {
      id,
      props: {},
      ...modal,
    } as ModalProps;

    setModals((prev) => [...prev, newModal]);
    return id;
  }, []);

  const updateModal = useCallback(
    (id: string, updates: Partial<ModalProps>) => {
      setModals((prev) =>
        prev.map((modal) =>
          modal.id === id ? { ...modal, ...updates } : modal,
        ),
      );
    },
    [],
  );

  const closeModal = useCallback((id: string) => {
    setModals((prev) => prev.filter((modal) => modal.id !== id));
  }, []);

  const closeTopModal = useCallback(() => {
    setModals((prev) => prev.slice(0, -1));
  }, []);

  const clearModals = useCallback(() => {
    setModals([]);
  }, []);

  // ==================== OVERLAY VIEWS HELPERS ====================

  const openRecipeForm = useCallback((recipeUuid: string = '') => {
    setCurrentOverlayView({
      type: 'recipe',
      mode: 'edit',
      props: { recipeUuid },
    });
  }, []);

  const openRecipeView = useCallback((recipeUuid: string) => {
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

  // Gestion de l'état UI global
  const updateUiState = useCallback((updates: Partial<UIState>) => {
    setUiState((prev) => ({ ...prev, ...updates }));
  }, []);

  const toggleSidebar = useCallback(() => {
    setUiState((prev) => ({ ...prev, sidebarOpen: !prev.sidebarOpen }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setUiState((prev) => ({ ...prev, loading }));
  }, []);

  const resetCurrentOverlayView = useCallback(() => {
    setCurrentOverlayView(defaultOverlayView);
  }, []);

  const value = {
    // État
    notices,
    modals,
    uiState,

    // Gestion des notices
    addNotice,
    removeNotice,
    clearNotices,

    // Gestion des modals
    openModal,
    updateModal,
    closeModal,
    closeTopModal,
    clearModals,

    // Gestion UI globale
    updateUiState,
    toggleSidebar,
    setLoading,

    // Gestion des overlay views
    currentOverlayView,
    setCurrentOverlayView,
    openRecipeForm,
    openRecipeView,
    openUrlImport,
    openSettings,
    resetCurrentOverlayView,
  };

  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
};

export const useView = () => {
  const context = useContext(ViewContext);
  if (!context) {
    throw new Error('useView must be used within a ViewProvider');
  }
  return context;
};
