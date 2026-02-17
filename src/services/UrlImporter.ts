import { Recipe } from '@src/models/entities/Recipe';
import { RecipeData } from '@src/types/entities';
import { parse } from 'tinyduration';
import { ApiService } from './api/ApiService';

export interface RecipeSchema {
  '@type': 'Recipe';
  name: string;
  description: string;
  recipeYield: string;
  prepTime: string;
  cookTime: string;
  recipeIngredient: [] | string[];
  recipeInstructions: [] | string[] | { text: string };
  image: string | { url?: string; contentUrl?: string };
}

export class UrlImporter {
  static async getRecipesFromUrl(url = ''): Promise<Recipe[]> {
    if (!url) {
      throw new Error('URL is required to import a recipe.');
    }
    const apiService = new ApiService();
    const recipeSchemes =
      await apiService.operations.global.getRecipesSchemaFromUrl(url);
    return Promise.all(
      recipeSchemes.map(async (recipe) => await this.mapSchemaToRecipe(recipe)),
    );
  }

  static async mapSchemaToRecipe(schema: RecipeSchema): Promise<Recipe> {
    const recipeData: Partial<RecipeData> = {
      name: schema.name || 'Untitled Recipe',
      description: schema.description || '',
      portions: schema.recipeYield || '',
    };

    const newRecipe = new Recipe(recipeData);

    // Temps de préparation et de cuisson
    // Convert ISO 8601 durations to minutes if needed
    if (schema.prepTime && !parseInt(schema.prepTime)) {
      const parsedPrepTime = parse(schema.prepTime);
      newRecipe.timePreparation = parsedPrepTime
        ? (parsedPrepTime.days || 0) * 24 * 60 +
          (parsedPrepTime.hours || 0) * 60 +
          (parsedPrepTime.minutes || 0)
        : 0;
    } else {
      newRecipe.timePreparation = parseInt(schema.prepTime) || 0;
    }
    if (schema.cookTime && !parseInt(schema.cookTime)) {
      const parsedCookTime = parse(schema.cookTime);
      newRecipe.timeCook = parsedCookTime
        ? (parsedCookTime.days || 0) * 24 * 60 +
          (parsedCookTime.hours || 0) * 60 +
          (parsedCookTime.minutes || 0)
        : 0;
    } else {
      newRecipe.timeCook = parseInt(schema.cookTime) || 0;
    }

    // Ingredients
    if (schema.recipeIngredient) {
      if (Array.isArray(schema.recipeIngredient)) {
        schema.recipeIngredient.forEach((ingredient) =>
          newRecipe.addIngredient({
            note: typeof ingredient === 'string' ? ingredient : '',
          }),
        );
      } else if (typeof schema.recipeIngredient === 'string') {
        newRecipe.addIngredient({ note: schema.recipeIngredient });
      }
    }

    // Etapes
    if (schema.recipeInstructions) {
      if (Array.isArray(schema.recipeInstructions)) {
        schema.recipeInstructions.forEach((instruction: any) => {
          if (typeof instruction === 'object' && instruction.text) {
            newRecipe.addStep(instruction.text);
          } else if (typeof instruction === 'string') {
            newRecipe.addStep(instruction);
          }
        });
      } else if (typeof schema.recipeInstructions === 'string') {
        newRecipe.addStep(schema.recipeInstructions);
      } else if (
        typeof schema.recipeInstructions === 'object' &&
        schema.recipeInstructions.text
      ) {
        newRecipe.addStep(schema.recipeInstructions.text);
      }
    }

    if (schema.image) {
      if (typeof schema.image === 'string') {
        newRecipe.imageUrl = schema.image;
      } else if (Array.isArray(schema.image) && schema.image.length > 0) {
        if (typeof schema.image[0] === 'string') {
          newRecipe.imageUrl = schema.image[0];
        } else if (
          typeof schema.image[0] === 'object' &&
          schema.image[0].contentUrl
        ) {
          newRecipe.imageUrl = schema.image[0].contentUrl;
        }
      } else if (typeof schema.image === 'object' && schema.image.url) {
        newRecipe.imageUrl = schema.image.url;
      } else if (typeof schema.image === 'object' && schema.image.contentUrl) {
        newRecipe.imageUrl = schema.image.contentUrl;
      }
    }

    return newRecipe;
  }
}
