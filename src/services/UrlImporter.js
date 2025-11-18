import { parse } from 'tinyduration';
import { ApiService } from "./api/ApiService";

export class UrlImporter {
    static async importRecipeFromUrl(url) {
        if (!url) {
            throw new Error('URL is required to import a recipe.');
        }
        // Logic to fetch and import recipe from the given URL

        const endpoint = '/scrape-recipe-jsonld';
        const params = new URLSearchParams();
        // Maybe encodeURIComponent is needed here
        params.append('url', encodeURIComponent(url));
        const queryString = params.toString();
        const apiUrl = `${endpoint}${queryString ? `?${queryString}` : ''}`;


        const apiService = ApiService.getInstance();

        try {
            const response = await apiService.fetchEndpointWithRetry(apiUrl);
            const data = await response.json();
            if (data && data.success && data.recipes) {
                const recipes = await Promise.all(data.recipes.map(async (recipe) => await this.mapJsonLdToRecipe(recipe)));
                return recipes;
            } else {
                throw new Error('No recipe data found at the provided URL.');
            }
        }
        catch (error) {
            throw error;
        }
    }

    static async mapJsonLdToRecipe(jsonLd) {
        const recipeData = {
            name: jsonLd.name || 'Untitled Recipe',
            description: jsonLd.description || '',
            portions: jsonLd.recipeYield || null,
        };

        // Temps de préparation et de cuisson
        // Convert ISO 8601 durations to minutes if needed
        if (jsonLd.prepTime && !parseInt(jsonLd.prepTime)) {
            const parsedPrepTime = parse(jsonLd.prepTime);
            recipeData.timePreparation = parsedPrepTime ? (parsedPrepTime.days || 0) * 24 * 60 + (parsedPrepTime.hours || 0) * 60 + (parsedPrepTime.minutes || 0) : null;
        } else {
            recipeData.timePreparation = jsonLd.prepTime || null;
        }
        if (jsonLd.cookTime && !parseInt(jsonLd.cookTime)) {
            const parsedCookTime = parse(jsonLd.cookTime);
            recipeData.timeCook = parsedCookTime ? (parsedCookTime.days || 0) * 24 * 60 + (parsedCookTime.hours || 0) * 60 + (parsedCookTime.minutes || 0) : null;
        } else {
            recipeData.timeCook = jsonLd.cookTime || null;
        }

        // Ingredients
        if (jsonLd.recipeIngredient) {
            if (Array.isArray(jsonLd.recipeIngredient)) {
                recipeData.ingredients = jsonLd.recipeIngredient.map(ingredient => ({ note: ingredient }));
            } else if (typeof jsonLd.recipeIngredient === 'string') {
                recipeData.ingredients = [{ note: jsonLd.recipeIngredient }];
            }
        }

        // Etapes
        if (jsonLd.recipeInstructions) {
            if (Array.isArray(jsonLd.recipeInstructions)) {
                recipeData.steps = jsonLd.recipeInstructions.map(instr => (typeof instr === 'string' ? instr : instr.text || '')).filter(Boolean);
            } else if (typeof jsonLd.recipeInstructions === 'string') {
                recipeData.steps = [jsonLd.recipeInstructions];
            } else if (typeof jsonLd.recipeInstructions === 'object' && jsonLd.recipeInstructions.text) {
                recipeData.steps = [jsonLd.recipeInstructions.text];
            }
        }

        if (jsonLd.image) {
            if (typeof jsonLd.image === 'string') {
                recipeData.imageUrl = jsonLd.image;
            } else if (Array.isArray(jsonLd.image) && jsonLd.image.length > 0) {
                if (typeof jsonLd.image[0] === 'string') {
                    recipeData.imageUrl = jsonLd.image[0];
                } else if (typeof jsonLd.image[0] === 'object' && jsonLd.image[0].contentUrl) {
                    recipeData.imageUrl = jsonLd.image[0].contentUrl;
                }
            } else if (typeof jsonLd.image === 'object' && jsonLd.image.url) {
                recipeData.imageUrl = jsonLd.image.url;
            } else if (typeof jsonLd.image === 'object' && jsonLd.image.contentUrl) {
                recipeData.imageUrl = jsonLd.image.contentUrl;
            }
        }

        return recipeData;
    }
}