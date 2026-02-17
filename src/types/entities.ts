// Entity Data Interfaces - Constructor input types

import {
  config,
  Endpoint,
  EndpointIngredients,
  EndpointTypes,
} from '@src/config/config';
import { Image } from '@src/models/entities/Image';
import { Ingredient } from '@src/models/entities/Ingredient';
import { Note } from '@src/models/entities/Note';
import { Recipe } from '@src/models/entities/Recipe';
import { Type } from '@src/models/entities/Type';
import {
  BaseEntityStorage,
  BaseSyncEntityFields,
  BaseSyncEntityStorage,
  ImageStorage,
  IngredientStorage,
  NoteStorage,
  RecipeIngredientStorage,
  RecipeStorage,
  RecipeTypeStorage,
  TypeStorage,
} from './storage';

export type BaseEntityData = BaseEntityStorage;

export type BaseSyncEntityData = BaseSyncEntityStorage;

export type BaseSyncEntityApi = Omit<
  BaseSyncEntityStorage,
  'isDirty' | 'lastSyncDate'
> & {
  dateReceived?: string;
};

export type DifficultyLevels = (typeof config.DIFFICULTY_LEVELS)[number];

export interface RecipeDataFields {
  image?: ImageData | null;
  imageUrl?: string;
  ingredients?: RecipeIngredientData[];
  types?: RecipeTypeData[];
  notes?: NoteData[];
}

export type RecipeData = RecipeStorage & RecipeDataFields;

// Recipe relation interfaces
export type RecipeIngredientData = Omit<
  RecipeIngredientStorage,
  'recipeUuid' | 'uuid'
> & {
  ingredient?: Ingredient;
  uuid?: string;
  name?: string;
};

export type RecipeTypeData = Omit<RecipeTypeStorage, 'recipeUuid' | 'uuid'> & {
  type?: Type;
  uuid?: string;
  name?: string;
};

export type RecipeApi = BaseSyncEntityApi &
  Omit<
    RecipeData,
    | 'image'
    | 'imageUrl'
    | 'isDirty'
    | 'lastSyncDate'
    | 'ingredients'
    | 'types'
    | 'notes'
    | 'tested'
    | 'favorite'
  > & {
    tested: boolean;
    favorite: boolean;
    ingredients: (Omit<
      RecipeIngredientData,
      'uuid' | 'recipeUuid' | 'ingredient'
    > & {
      ingredient?: IngredientApi;
    })[];
    types: (Omit<RecipeTypeData, 'uuid' | 'recipeUuid' | 'type'> & {
      type?: TypeApi;
    })[];
    notes: NoteApi[];
  };

export type RecipeMainDependenciesEndpoint =
  | EndpointIngredients
  | EndpointTypes;
export type RecipeMainDependenciesEntity = Ingredient | Type;
export type RecipeMainDependenciesEntityData = IngredientData | TypeData;

export type IngredientData = IngredientStorage;

export type IngredientFormData = Omit<
  IngredientData,
  keyof BaseSyncEntityFields
>;

export type IngredientApi = Omit<IngredientData, 'isDirty' | 'lastSyncDate'>;

export type TypeData = TypeStorage;

export type TypeFormData = Omit<TypeData, keyof BaseSyncEntityFields>;

export type TypeApi = Omit<TypeData, 'isDirty' | 'lastSyncDate'>;

export type ImageData = ImageStorage & {
  // Api-only properties
  '@type'?: string;
};

export type ImageFormData = ImageData;

export type ImageApi = Omit<ImageData, 'isDirty' | 'lastSyncDate'> & {
  file: Blob;
};

export type NoteData = NoteStorage;

export type NoteFormData = NoteData;

export type NoteApi = NoteData;

export type EntityApi =
  | RecipeApi
  | IngredientApi
  | TypeApi
  | ImageData
  | NoteApi;

// Validation Rule Types
export interface ValidationCondition {
  condition: boolean;
  message: string;
}

export type ValidationRules = Record<string, ValidationCondition[]>;

// EntityData is one of Recipe, Ingredient, Type, Image, etc.
export type EntityData =
  | RecipeData
  | IngredientData
  | TypeData
  | ImageData
  | NoteData;

export type EntitySyncableData = RecipeData | IngredientData | TypeData;

// Entity instances (not constructors)
export type Entity = Recipe | Ingredient | Type | Image | Note;
export type EntitySyncable = Recipe | Ingredient | Type;
export type RecipeRelation = Ingredient | Type;

// Generic constructor types for base classes
export type EntityConstructor<T extends Entity = Entity> = {
  new (data?: any, asUpdate?: boolean): T;
};
export type EntitySyncableConstructor<
  T extends EntitySyncable = EntitySyncable,
> = { new (data?: any, asUpdate?: boolean): T };

export type LocalDirtyVersion = {
  uuid: string;
  version: number;
  dateModify: string;
  dateDeleted: string;
  lastSyncDate: string;
};

export type RemoteDirtyVersion = {
  endpoint: Endpoint;
  uuid: string;
  dateReceived: string;
  dateDeleted: string;
};
