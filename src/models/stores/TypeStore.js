import { Type } from '../entities/Type';
import { BaseSyncStore } from './BaseSyncStore';

/**
 * Service de stockage local pour les types (IndexedDB)
 * Responsabilité : Persistance des données locales uniquement
 */
export class TypeStore extends BaseSyncStore {
  static EntityClass = Type;
  static endpoint = 'types';
  static defaultOptions = {
    sortBy: 'name',
    reverse: false
  };

  /**
   * Récupère les types utilisés dans les recettes
   */
  async getUsed() {
    const uniqueTypeUuids = await this.database.recipeTypes.orderBy('typeUuid').uniqueKeys(function (keysArray) {
      return keysArray;
    });
    if (uniqueTypeUuids.length === 0) {
      return [];
    }
    const uniqueTypes = await this.getAllBy('uuid', uniqueTypeUuids, { sortBy: 'name' });
    return uniqueTypes;
  }

  async getRelatedRecipesUuids(typeUuid) {
    return this.database.recipeTypes.where('typeUuid').equals(typeUuid).toArray().then(relations => {
      return relations.map(relation => relation.recipeUuid);
    });
  }
}
