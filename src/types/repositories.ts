import {
  Endpoint,
  EndpointImages,
  EndpointIngredients,
  EndpointNotes,
  EndpointRecipes,
  EndpointSyncable,
  EndpointTypes,
} from '@src/config/config';
import { Image } from '@src/models/entities/Image';
import { Ingredient } from '@src/models/entities/Ingredient';
import { Note } from '@src/models/entities/Note';
import { Recipe } from '@src/models/entities/Recipe';
import { Type } from '@src/models/entities/Type';
import { ImageRepository } from '@src/services/data/repositories/ImageRepository';
import { IngredientRepository } from '@src/services/data/repositories/IngredientRepository';
import { NoteRepository } from '@src/services/data/repositories/NoteRepository';
import { RecipeRepository } from '@src/services/data/repositories/RecipeRepository';
import { TypeRepository } from '@src/services/data/repositories/TypeRepository';
import { DifficultyLevels } from './entities';

export interface HydrateOptions {
  withImage: boolean;
  withRecipeIngredients: boolean;
  withRecipeTypes: boolean;
  withNotes: boolean;
  /**
   * Control dependency hydration level:
   * - "" (empty): No dependencies returned
   * - "name": Dependencies with hydrated names only
   * - "full": Dependencies with full entity objects
   */
  hydrateDependencies: '' | 'name' | 'full';
  complete: boolean;
}

export type Repository =
  | RecipeRepository
  | IngredientRepository
  | TypeRepository
  | NoteRepository
  | ImageRepository;
export type SyncRepository =
  | RecipeRepository
  | IngredientRepository
  | TypeRepository;
export type UniqueNameRepository = IngredientRepository | TypeRepository;

// Map type that guarantees all syncable repositories are present
export type SyncRepositoriesMap = Map<EndpointSyncable, SyncRepository> & {
  get(key: EndpointRecipes): RecipeRepository;
  get(key: EndpointIngredients): IngredientRepository;
  get(key: EndpointTypes): TypeRepository;
  // get(key: EndpointSyncable): SyncRepository;
};

export type RepositoriesMap = SyncRepositoriesMap &
  Map<Endpoint, Repository> & {
    get(key: EndpointNotes): NoteRepository;
    get(key: EndpointImages): ImageRepository;
    // get(key: Endpoint): Repository;
  };

export type RepositoriesRecords = {
  recipes: RecipeRepository;
  ingredients: IngredientRepository;
  types: TypeRepository;
  notes: NoteRepository;
  images: ImageRepository;
};

export interface RecipeFilters {
  search: string;
  ingredients: Ingredient[];
  types: Type[];
  difficulties: DifficultyLevels[];
  deleted: boolean;
}

export const defaultRecipeFilters: RecipeFilters = {
  search: '',
  ingredients: [],
  types: [],
  difficulties: [],
  deleted: false,
};

/**
 * Type mapper: Endpoint → Entity Type
 * Permet de récupérer le type d'entité correct basé sur l'endpoint
 */
export type EndpointToEntity<T extends Endpoint = Endpoint> =
  T extends EndpointRecipes
    ? Recipe
    : T extends EndpointIngredients
      ? Ingredient
      : T extends EndpointTypes
        ? Type
        : T extends EndpointNotes
          ? Note
          : T extends EndpointImages
            ? Image
            : never;

// Type helper for getRepository with perfect type narrowing using typed constants
// Usage: getRepository(config.ENDPOINTS_CONSTANTS.RECIPES) returns RecipeRepository
export interface GetRepositoryInterface {
  (endpoint: EndpointRecipes): RecipeRepository;
  (endpoint: EndpointIngredients): IngredientRepository;
  (endpoint: EndpointTypes): TypeRepository;
  (endpoint: EndpointNotes): NoteRepository;
  (endpoint: EndpointImages): ImageRepository;
  (endpoint: EndpointSyncable): SyncRepository;
  (endpoint: Endpoint): Repository;
  (endpoint: string): undefined;
}
