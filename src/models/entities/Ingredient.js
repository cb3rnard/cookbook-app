import { BaseSyncEntity } from './BaseSyncEntity.js';

export class Ingredient extends BaseSyncEntity {
  constructor(data = {}) {
    super(data); // Appelle le constructeur BaseEntity

    // Propriétés spécifiques à Ingredient
    this.name = data.name ? data.name.toLowerCase() : '';
    this.type = data.type || '';
  }

  /**
   * Règles de validation
   */
  validationRules() {
    return {
      name: [
        {
          condition: !this.name || this.name.trim().length === 0,
          message: 'Le nom de l\'ingrédient est obligatoire',
        },
        {
          condition: this.name && this.name.length > 100,
          message: 'Le nom de l\'ingrédient ne peut pas dépasser 100 caractères',
        },
      ],
      type: [
        {
          condition: this.type && this.type.length > 50,
          message: 'Le type ne peut pas dépasser 50 caractères',
        },
      ],
    }
  }

  /**
   * Prépare les données pour la sauvegarde
   */
  toStorage() {
    return {
      ...super.toStorage(),
      uuid: this.uuid,
      name: this.name,
      type: this.type
    };
  }

  /**
   * Prépare les données pour l'API
   */
  toApi() {
    return {
      ...super.toApi(),
      uuid: this.uuid,
      name: this.name,
      type: this.type
    };
  }
}
