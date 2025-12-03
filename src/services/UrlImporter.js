import { parse } from "tinyduration";
import { ApiService } from "./api/ApiService";

export class UrlImporter {
  static async getRecipesFromUrl(url = "") {
    if (!url) {
      throw new Error("URL is required to import a recipe.");
    }
    const apiService = new ApiService();
    const recipeSchemes =
      await apiService.operations.global.getRecipesSchemaFromUrl(url);
    recipeSchemes.map(async (recipe) => await this.mapSchemaToRecipe(recipe));
  }

  static async mapSchemaToRecipe(schema) {
    const recipeData = {
      name: schema.name || "Untitled Recipe",
      description: schema.description || "",
      portions: schema.recipeYield || null,
    };

    // Temps de préparation et de cuisson
    // Convert ISO 8601 durations to minutes if needed
    if (schema.prepTime && !parseInt(schema.prepTime)) {
      const parsedPrepTime = parse(schema.prepTime);
      recipeData.timePreparation = parsedPrepTime
        ? (parsedPrepTime.days || 0) * 24 * 60 +
          (parsedPrepTime.hours || 0) * 60 +
          (parsedPrepTime.minutes || 0)
        : null;
    } else {
      recipeData.timePreparation = schema.prepTime || null;
    }
    if (schema.cookTime && !parseInt(schema.cookTime)) {
      const parsedCookTime = parse(schema.cookTime);
      recipeData.timeCook = parsedCookTime
        ? (parsedCookTime.days || 0) * 24 * 60 +
          (parsedCookTime.hours || 0) * 60 +
          (parsedCookTime.minutes || 0)
        : null;
    } else {
      recipeData.timeCook = schema.cookTime || null;
    }

    // Ingredients
    if (schema.recipeIngredient) {
      if (Array.isArray(schema.recipeIngredient)) {
        recipeData.ingredients = schema.recipeIngredient.map((ingredient) => ({
          note: ingredient,
        }));
      } else if (typeof schema.recipeIngredient === "string") {
        recipeData.ingredients = [{ note: schema.recipeIngredient }];
      }
    }

    // Etapes
    if (schema.recipeInstructions) {
      if (Array.isArray(schema.recipeInstructions)) {
        recipeData.steps = schema.recipeInstructions
          .map((instr) =>
            typeof instr === "string" ? instr : instr.text || "",
          )
          .filter(Boolean);
      } else if (typeof schema.recipeInstructions === "string") {
        recipeData.steps = [schema.recipeInstructions];
      } else if (
        typeof schema.recipeInstructions === "object" &&
        schema.recipeInstructions.text
      ) {
        recipeData.steps = [schema.recipeInstructions.text];
      }
    }

    if (schema.image) {
      if (typeof schema.image === "string") {
        recipeData.imageUrl = schema.image;
      } else if (Array.isArray(schema.image) && schema.image.length > 0) {
        if (typeof schema.image[0] === "string") {
          recipeData.imageUrl = schema.image[0];
        } else if (
          typeof schema.image[0] === "object" &&
          schema.image[0].contentUrl
        ) {
          recipeData.imageUrl = schema.image[0].contentUrl;
        }
      } else if (typeof schema.image === "object" && schema.image.url) {
        recipeData.imageUrl = schema.image.url;
      } else if (typeof schema.image === "object" && schema.image.contentUrl) {
        recipeData.imageUrl = schema.image.contentUrl;
      }
    }

    return recipeData;
  }
}
