// ❌ BARREL FILE SUPPRIMÉ
// Utilise des imports directs pour optimiser tree-shaking et IDE support
// 
// Exemple d'import direct :
// import { RecipeForm } from './forms/RecipeForm.jsx';
// import { EntitySelect } from './ui/EntitySelect.jsx';
//
// Avantages :
// ✅ Tree-shaking optimal
// ✅ Auto-import IDE fonctionne
// ✅ Refactoring automatique
// ✅ Performance HMR améliorée

// Layout
export { GlobalUI } from './layout/GlobalUI.jsx';
export { Header } from './layout/Header.jsx';
export { OverlayView } from './layout/OverlayView.jsx';
export { Settings } from './layout/Settings.jsx';

// Recipe
export { RecipeGrid } from './recipe/RecipeGrid.jsx';
export { RecipeView } from './recipe/RecipeView.jsx';

// Debug
export { DebugControls } from './debug/DebugControls.jsx';

// Main
export { OverlayManager } from './OverlayManager.jsx';
