/**
 * Common types for table operations
 */

export interface RecipeIngredientRelation {
  recipeUuid: string;
  ingredientUuid: string;
  quantity: number;
  unit: string;
  note?: string;
}

export interface RecipeTypeRelation {
  recipeUuid: string;
  typeUuid: string;
}

export interface NoteRelation {
  uuid: string;
  recipeUuid: string;
  content: string;
  dateAdd: string;
}
