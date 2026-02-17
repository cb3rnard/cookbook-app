import { CONFIG_DEBUG_STATES, CONFIG_DEFAULTS } from './config.defaults';

/**
 * Strongly-typed endpoint constants
 * Each constant preserves its literal type for perfect type narrowing
 */
const ENDPOINTS_CONSTANTS_VALUES = {
  RECIPES: 'recipes' as const,
  INGREDIENTS: 'ingredients' as const,
  TYPES: 'types' as const,
  NOTES: 'notes' as const,
  IMAGES: 'images' as const,
} as const;

const CONFLICT_STRATEGIES_VALUES = {
  LOCAL_WINS: 'LOCAL_WINS' as const,
  REMOTE_WINS: 'REMOTE_WINS' as const,
  LAST_WRITE_WINS: 'LAST_WRITE_WINS' as const,
  MANUAL: 'MANUAL' as const,
} as const;

export const CONSTANTS_ENDPOINTS = {
  // Generate ENDPOINTS from ENDPOINTS_CONSTANTS to avoid duplication
  ENDPOINTS: Object.values(ENDPOINTS_CONSTANTS_VALUES),
  // Relations first for sync order
  ENDPOINTS_SYNCABLE: [
    ENDPOINTS_CONSTANTS_VALUES.INGREDIENTS,
    ENDPOINTS_CONSTANTS_VALUES.TYPES,
    ENDPOINTS_CONSTANTS_VALUES.RECIPES,
  ],
  ENDPOINTS_UNIQUE_NAMES: [
    ENDPOINTS_CONSTANTS_VALUES.INGREDIENTS,
    ENDPOINTS_CONSTANTS_VALUES.TYPES,
  ],
  RECIPES_MAIN_DEPENDENCIES: [
    ENDPOINTS_CONSTANTS_VALUES.INGREDIENTS,
    ENDPOINTS_CONSTANTS_VALUES.TYPES,
  ],
  // Include typed endpoint constants for type-safe usage
  ENDPOINTS_CONSTANTS: ENDPOINTS_CONSTANTS_VALUES,
};

export const CONSTANTS_SYNC = {
  MIN_REFRESH_MINUTES: 1,
  CONFLICT_STRATEGIES: Object.keys(CONFLICT_STRATEGIES_VALUES).map(
    (key) =>
      CONFLICT_STRATEGIES_VALUES[
        key as keyof typeof CONFLICT_STRATEGIES_VALUES
      ],
  ),
  CONFLICT_STRATEGIES_VALUES,
};

export const NOTICE_TYPES = {
  INFO: 'info' as const,
  SUCCESS: 'success' as const,
  WARNING: 'warning' as const,
  ERROR: 'error' as const,
  NEUTRAL: 'neutral' as const,
} as const;

export type NoticeType = (typeof NOTICE_TYPES)[keyof typeof NOTICE_TYPES];

/**
 * Application constants (immutable)
 */
export const CONFIG_CONSTANTS = {
  APP_NAME: 'Cookbook App',
  VERSION: '1.0.0',
  DIFFICULTY_LEVELS: ['easy', 'medium', 'hard'],
  NOTICE_TYPES,
  ...CONSTANTS_ENDPOINTS,
  ...CONSTANTS_SYNC,
} as const;

/**
 * TypeScript types for configuration
 */
export type KnownConfig = typeof CONFIG_DEFAULTS;
export type ConfigKey = keyof KnownConfig;
export type ConfigValues = KnownConfig & Record<string, unknown>;

/**
 * Granular endpoint types - each maps to its constant value
 * This enables type-safe getRepository(config.ENDPOINTS_CONSTANTS.RECIPES)
 */
export type EndpointRecipes = typeof ENDPOINTS_CONSTANTS_VALUES.RECIPES;
export type EndpointIngredients = typeof ENDPOINTS_CONSTANTS_VALUES.INGREDIENTS;
export type EndpointTypes = typeof ENDPOINTS_CONSTANTS_VALUES.TYPES;
export type EndpointNotes = typeof ENDPOINTS_CONSTANTS_VALUES.NOTES;
export type EndpointImages = typeof ENDPOINTS_CONSTANTS_VALUES.IMAGES;

/**
 * Endpoint union types - derived from granular types
 */
export type Endpoint =
  | EndpointRecipes
  | EndpointIngredients
  | EndpointTypes
  | EndpointNotes
  | EndpointImages;
export type EndpointWDefault = Endpoint | 'default';
export type EndpointSyncable =
  | EndpointIngredients
  | EndpointTypes
  | EndpointRecipes;
export type EndpointSyncableWDefault = EndpointSyncable | 'default';
export type EndpointRecipeRelationsDependencies =
  | EndpointIngredients
  | EndpointTypes;
export type UniqueNameEndpoint = EndpointIngredients | EndpointTypes;

export type ConflictStrategy =
  (typeof CONFLICT_STRATEGIES_VALUES)[keyof typeof CONFLICT_STRATEGIES_VALUES];
/**
 * Runtime configuration object - SINGLE SOURCE OF TRUTH
 * Initialized with defaults at import, then merged with user preferences by ConfigService.initialize()
 * Updated synchronously by ConfigService when settings change
 *
 * USAGE:
 * - Services/utilities: import { config } from '@/config/config'
 *   → Direct access, always up-to-date via reference
 *
 * - React components: const { config } = useConfig()
 *   → Reactive, triggers re-renders on changes
 *
 * NEVER modify directly! Use ConfigService.set() to persist changes.
 */
export const config: ConfigValues & typeof CONFIG_CONSTANTS = {
  ...CONFIG_CONSTANTS,
  ...CONFIG_DEFAULTS,
};

// Export constants as aliases for backward compatibility and convenience
export { CONFIG_DEBUG_STATES, CONFIG_DEFAULTS };
