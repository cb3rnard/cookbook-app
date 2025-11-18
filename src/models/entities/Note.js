import { BaseEntity } from './BaseEntity';

export class Note extends BaseEntity {
  constructor(data = {}) {
    super(data);
    this.content = data.content || '';
    this.recipeUuid = data.recipeUuid || null;
    this.dateAdd = data.dateAdd || new Date().toISOString();
  }

  /**
   * Règles de validation
   */
  validationRules() {
    return {
      content: [
        {
          condition: !this.content || this.content.trim().length === 0,
          message: 'Le contenu de la note est obligatoire',
        },
        {
          condition: this.content && this.content.length > 500,
          message: 'Le contenu de la note ne peut pas dépasser 500 caractères',
        },
      ],
      recipeUuid: [
        {
          condition: !this.recipeUuid,
          message: 'La note doit être associée à une recette',
        },
      ],
    };
  }

  toStorage() {
    return {
      uuid: this.uuid,
      content: this.content,
      recipeUuid: this.recipeUuid,
      dateAdd: this.dateAdd,
    };
  }

  toApi() {
    return {
      uuid: this.uuid,
      content: this.content,
      recipeUuid: this.recipeUuid,
      dateAdd: this.dateAdd,
    };
  }
}
