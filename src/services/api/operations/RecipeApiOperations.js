import { DebugService } from "../../DebugService.js";
import { ApiOperations } from "./ApiOperations.js";

export class RecipeApiOperations extends ApiOperations {
  static _endpoints = {
    recipesWithDependencies: "/recipes/{uuid}/with_dependencies",
    recipeImage: "/recipes/{uuid}/image",
  };

  /**
   * Récupère une recette avec ses dépendances (ingrédients + types complets)
   * @param {string} uuid - UUID de la recette
   * @param {string|null} since - Date ISO pour filtrer les dépendances modifiées depuis
   * @returns {Promise<Object|null>} Recette avec dépendances complètes ou null
   */
  async getRecipeWithDependencies(uuid, since = null) {
    DebugService.debug(`getRecipeWithDependencies`);
    if (!uuid) {
      throw new Error("UUID is required to fetch a recipe with dependencies");
    }

    const endpoint = this.getUuidEndpoint("recipesWithDependencies", uuid);
    const params = new URLSearchParams();
    if (since) {
      since = new Date(since).toISOString();
      params.append("since", new Date(since).toISOString());
    }
    const queryString = params.toString();
    const url = `${endpoint}${queryString ? `?${queryString}` : ""}`;
    const context = `getRecipeWithDependencies ${uuid}`;

    const response = await this.fetchEndpointWithRetry(
      url,
      { method: "GET" },
      {},
      context,
    );
    const responseData = await response.json();
    return responseData || null;
  }

  /**
   * Upload d'une image
   * @param {FormData} formData - Données de l'image avec le fichier
   * @returns {Promise<Object>} Résultat de l'upload
   */
  async uploadRecipeImage(recipeUuid, imageData) {
    console.log(`Uploading image for recipe ${recipeUuid}`);
    const endpoint = this.getUuidEndpoint("recipeImage", recipeUuid);
    const context = "uploadImage";

    const response = await this.fetchEndpointWithRetry(
      endpoint,
      { method: "POST", body: imageData },
      { retries: 2, timeout: 60000 }, // Plus de timeout pour les uploads
      context,
    );
    const responseData = await response.json();
    return responseData;
  }
}
