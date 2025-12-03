// import { RecipeService } from '../../RecipeService';
import { DebugService } from "../../services/DebugService";
import { BaseSyncTable } from "./BaseSyncTable";

/**
 * Service de stockage local pour les recettes (IndexedDB)
 * Responsabilité : Persistance des données locales + logique métier + synchronisation
 */
export class RecipeTable extends BaseSyncTable {
  static defaultOptions = {
    sortBy: "dateModify",
    reverse: true,
  };

  /**
   * Supprime une recette
   */
  async delete(uuid, importing = false) {
    const deletedEntity = await super.delete(uuid, importing);
    try {
      await this.database.transaction(
        "rw",
        [
          this.databaseTable,
          this.database.recipeIngredients,
          this.database.recipeTypes,
        ],
        async () => {
          // await this.databaseTable.where('uuid').equals(uuid).delete();
          await this.database.recipeIngredients
            .where("recipeUuid")
            .equals(uuid)
            .delete();
          await this.database.recipeTypes
            .where("recipeUuid")
            .equals(uuid)
            .delete();
        },
      );
      return deletedEntity;
    } catch (error) {
      throw error;
    }
  }

  async filter(filters = null, fromSet = []) {
    if (!filters) {
      return fromSet.length > 0 ? fromSet : await this.getAll();
    }
    let recipes = [];

    const ingredientsUuids = filters.ingredients || [];
    const typesUuids = filters.types || [];

    DebugService.storageLog(
      "Filtering recipes with ingredients:",
      ingredientsUuids,
      "and types:",
      typesUuids,
    );

    if (ingredientsUuids.length > 0 || typesUuids.length > 0) {
      if (fromSet.length > 0) {
        DebugService.storageLog(
          "Applying related entity filters on provided fromSet of recipes",
        );
        const fromSetUuids = fromSet.map((recipe) => recipe.uuid);

        const recipeIngredients = await this.database.recipeIngredients
          .where("ingredientUuid")
          .anyOf(ingredientsUuids)
          .and((ri) => fromSetUuids.includes(ri.recipeUuid))
          .toArray();

        const recipeTypes = await this.database.recipeTypes
          .where("typeUuid")
          .anyOf(typesUuids)
          .and((rt) => fromSetUuids.includes(rt.recipeUuid))
          .toArray();

        const recipeUuidsFromIngredients = recipeIngredients.map(
          (ri) => ri.recipeUuid,
        );
        const recipeUuidsFromTypes = recipeTypes.map((rt) => rt.recipeUuid);

        const filteredRecipeUuids = [
          ...new Set([...recipeUuidsFromIngredients, ...recipeUuidsFromTypes]),
        ];

        recipes = await this.databaseTable
          .where("uuid")
          .anyOf(filteredRecipeUuids);
      } else {
        const recipeIngredients = await this.database.recipeIngredients
          .where("ingredientUuid")
          .anyOf(ingredientsUuids)
          .toArray();
        const recipeTypes = await this.database.recipeTypes
          .where("typeUuid")
          .anyOf(typesUuids)
          .toArray();
        const recipeUuidsFromIngredients = recipeIngredients.map(
          (ri) => ri.recipeUuid,
        );
        const recipeUuidsFromTypes = recipeTypes.map((rt) => rt.recipeUuid);

        const filteredRecipeUuids = [
          ...new Set([...recipeUuidsFromIngredients, ...recipeUuidsFromTypes]),
        ];

        recipes = await this.databaseTable
          .where("uuid")
          .anyOf(filteredRecipeUuids);
      }

      if (!filters.deleted) {
        DebugService.storageLog("Excluding deleted recipes");
        recipes = recipes.and((recipe) => !recipe.dateDeleted);
      }
      recipes = await recipes.toArray();
    } else {
      DebugService.storageLog(
        "No related entity filters applied, fetching all recipes",
      );
      recipes =
        fromSet.length > 0
          ? fromSet
          : await this.getAll({}, filters.deleted || false);
    }

    // Niveau
    DebugService.storageLog(
      "Filtering recipes with difficulty:",
      filters.difficulties,
    );

    if (filters.difficulties && filters.difficulties.length > 0) {
      recipes = recipes.filter((recipe) =>
        filters.difficulties.includes(recipe.difficulty),
      );
    }

    return recipes;
  }

  /**
   * Récupère les difficultés utilisées
   */
  async getUsedDifficultyLevels() {
    try {
      return await this.databaseTable.orderBy("difficulty").uniqueKeys();
    } catch (error) {
      return [];
    }
  }

  async getRecipeIngredients(recipeUuid) {
    return await this.database.recipeIngredients
      .where("recipeUuid")
      .equals(recipeUuid)
      .toArray();
  }

  async getRecipeTypes(recipeUuid) {
    return await this.database.recipeTypes
      .where("recipeUuid")
      .equals(recipeUuid)
      .toArray();
  }

  /**
   * Sauvegarde les ingrédients d'une recette
   */
  async saveRecipeIngredients(recipeUuid, recipeIngredients, deleteOld = true) {
    // Supprime les anciens ingrédients liés à la recette
    if (deleteOld) {
      await this.database.recipeIngredients
        .where("recipeUuid")
        .equals(recipeUuid)
        .delete();
    }

    if (recipeIngredients && recipeIngredients.length > 0) {
      const filteredRecipeIngredients = recipeIngredients
        .map((recipeIngredient) => {
          const ingredientUuid = recipeIngredient.ingredientUuid || null;

          return {
            ingredientUuid: ingredientUuid,
            recipeUuid: recipeUuid,
            quantity: recipeIngredient.quantity || 0,
            unit: recipeIngredient.unit || "",
            note: recipeIngredient.note || "",
          };
        })
        .filter(
          (recipeIngredient) =>
            recipeIngredient.ingredientUuid || recipeIngredient.note,
        );

      return await this.database.recipeIngredients.bulkPut(
        filteredRecipeIngredients,
      );
    }
    return [];
  }

  /**
   * Sauvegarde les types d'une recette
   */
  async saveRecipeTypes(recipeUuid, recipeTypes, deleteOld = true) {
    // Supprime les anciens types liés à la recette
    if (deleteOld) {
      await this.database.recipeTypes
        .where("recipeUuid")
        .equals(recipeUuid)
        .delete();
    }

    if (recipeTypes && recipeTypes.length > 0) {
      const uniqueRecipeTypesMap = new Map();
      recipeTypes.forEach((recipeType) => {
        const typeUuid = recipeType.typeUuid || null;
        if (typeUuid) {
          uniqueRecipeTypesMap.set(typeUuid, {
            typeUuid: typeUuid,
            recipeUuid: recipeUuid,
          });
        }
      });
      const filteredRecipeTypes = Array.from(uniqueRecipeTypesMap.values());

      return await this.database.recipeTypes.bulkPut(filteredRecipeTypes);
    }
    return [];
  }

  /**
   * Replace recipes related entities (ingredients/recipeIngredients
   * or types/recipeTypes)
   * @param {string} endpoint - 'ingredients' or 'types'
   * @param {string} oldUuid - UUID to remplace
   * @param {string} newUuid - UUID to use as replacement
   * @return {Object} - { replacedCount, relatedRecipesUuids }
   */
  async replaceRecipesRelation(oldUuid, newUuid, endpoint = "") {
    if (["ingredients", "types"].includes(endpoint) === false) {
      return;
    }
    const relationUuidKey =
      endpoint === "ingredients" ? "ingredientUuid" : "typeUuid";
    const relationTable =
      endpoint === "ingredients"
        ? this.database.recipeIngredients
        : this.database.recipeTypes;
    console.log(
      `Replacing relations in recipes for ${endpoint} ${oldUuid} -> ${newUuid}`,
    );

    const replacedCount = await relationTable
      .where(relationUuidKey)
      .equals(oldUuid)
      .modify({ recipeUuid: newUuid });

    const recipesUuid = await relationTable
      .where(relationUuidKey)
      .equals(newUuid)
      .toArray((row) => row.recipeUuid);

    // Return unique values
    const uniqueRecipesUuid = await [...new Set(recipesUuid)];

    console.log(
      `Replaced ${replacedCount} relations in recipes for ${endpoint} ${oldUuid} -> ${newUuid}`,
    );
    return {
      replacedCount,
      relatedRecipesUuids: uniqueRecipesUuid,
    };
  }

  async deleteRecipeNotes(recipeUuid) {
    return await this.database.notes
      .where("recipeUuid")
      .equals(recipeUuid)
      .delete();
  }
}
