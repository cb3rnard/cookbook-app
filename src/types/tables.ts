import { Endpoint } from '@src/config/config';
import { BaseSyncTable } from '@src/models/tables/BaseSyncTable';
import { BaseTable } from '@src/models/tables/BaseTable';
import { ImageTable } from '@src/models/tables/ImageTable';
import { IngredientTable } from '@src/models/tables/IngredientTable';
import { NoteTable } from '@src/models/tables/NoteTable';
import { RecipeTable } from '@src/models/tables/RecipeTable';
import { TypeTable } from '@src/models/tables/TypeTable';

export type EntityTable =
  | typeof BaseTable
  | typeof BaseSyncTable
  | typeof RecipeTable
  | typeof IngredientTable
  | typeof TypeTable
  | typeof NoteTable
  | typeof ImageTable;
export type EntitySyncTable =
  | typeof BaseSyncTable
  | typeof RecipeTable
  | typeof IngredientTable
  | typeof TypeTable;

// Generic constructor types for base classes
export type TableConstructor<T extends BaseTable = BaseTable> = {
  new (endpoint: Endpoint): T;
};
