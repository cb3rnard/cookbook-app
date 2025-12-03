import { BaseTable } from "./BaseTable";

/**
 * Service de stockage local pour les notes (IndexedDB)
 * Responsabilité : Persistance des données locales uniquement
 */
export class NoteTable extends BaseTable {
  static defaultOptions = {
    sortBy: "dateAdd",
    reverse: true,
  };

  async getNotesByRecipeUuid(recipeUuid) {
    return await this.databaseTable
      .where("recipeUuid")
      .equals(recipeUuid)
      .toArray();
  }
}
