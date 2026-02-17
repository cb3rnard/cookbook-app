import Dexie, { type Table } from 'dexie';
import { DifficultyLevels } from './entities';

export interface BaseEntityStorage {
  uuid: string;
}

export interface BaseSyncEntityFields {
  dateAdd: string;
  dateModify: string;
  dateDeleted: string;
  version: number;
  lastSyncDate: string;
  isDirty: number;
}

export type BaseSyncEntityStorage = BaseEntityStorage & BaseSyncEntityFields;

export interface RecipeFields {
  name: string;
  tested: number;
  favorite: number;
  description: string;
  difficulty: DifficultyLevels;
  steps: string[];
  tags: string[];
  timePreparation: number;
  timeCook: number;
  portions: string;
  imageUuid: string;
}

export type RecipeStorage = BaseSyncEntityStorage & RecipeFields;

export interface RecipeIngredientStorage {
  uuid: string;
  ingredientUuid: string;
  recipeUuid: string;
  quantity: number;
  unit: string;
  note: string;
}

export interface RecipeTypeStorage {
  uuid?: string;
  typeUuid: string;
  recipeUuid: string;
}

export interface IngredientFields {
  name: string;
  type: string;
  excludeFromFilters: number;
}

export type IngredientStorage = BaseSyncEntityStorage & IngredientFields;

export interface TypeFields {
  name: string;
  parentUuid: string;
}

export type TypeStorage = BaseSyncEntityStorage & TypeFields;

export interface ImageFields {
  blob: Blob | null;
  size: number;
  mimeType: string;
}
export type ImageStorage = BaseEntityStorage & ImageFields;

export interface NoteFields {
  recipeUuid: string;
  content: string;
  dateAdd: string;
}

export type NoteStorage = BaseEntityStorage & NoteFields;

export interface OptionStorage {
  uuid: string;
  key: string;
  value: any;
}

export type EntitySyncableStorage =
  | RecipeStorage
  | IngredientStorage
  | TypeStorage;
export type EntityStorage = EntitySyncableStorage | ImageStorage | NoteStorage;
export type RecipeRelationsStorage =
  | RecipeIngredientStorage
  | RecipeTypeStorage;

export interface StorageEstimate {
  quota: number;
  usage: number;
  usagePercentage: number;
}

export class StorageDatabase extends Dexie {
  recipes!: Table<RecipeStorage, string>;
  ingredients!: Table<IngredientStorage, string>;
  recipeIngredients!: Table<RecipeIngredientStorage, string>;
  types!: Table<TypeStorage, string>;
  recipeTypes!: Table<RecipeTypeStorage, string>;
  images!: Table<ImageStorage, string>;
  notes!: Table<NoteStorage, string>;
  options!: Table<OptionStorage, string>;

  constructor(name?: string, options?: any) {
    super(name || 'CookbookDB', options);

    this.version(1).stores({
      recipes:
        '$$uuid, name, tested, favorite, *tags, timePreparation, timeCook, imageUuid, portions, difficulty, dateAdd, dateModify, version, lastSyncDate, isDirty, dateDeleted',
      ingredients:
        '$$uuid, &name, type, excludeFromFilters, dateAdd, dateModify, version, lastSyncDate, isDirty, dateDeleted',
      recipeIngredients:
        '$$uuid, ingredientUuid, recipeUuid, quantity, unit, [excludeFromFilters+ingredientUuid]',
      types:
        '$$uuid, &name, parentUuid, dateAdd, dateModify, version, lastSyncDate, isDirty, dateDeleted',
      recipeTypes: '$$uuid, recipeUuid, typeUuid',
      images: '$$uuid, name, mimeType, size, dateAdd',
      notes: '$$uuid, recipeUuid, content, dateAdd',
      options: '$$uuid, &key, value',
    });
  }
}
