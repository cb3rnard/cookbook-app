import { BaseSyncEntity } from './BaseSyncEntity';

export class Type extends BaseSyncEntity {
  constructor(data = {}) {
    super(data);

    this.name = data.name ? data.name.toLowerCase() : '';
    this.parentUuid = data.parentUuid || null;
  }

  /**
   * Règles de validation
   */
  validationRules() {
    return {
      name: [
        {
          condition: !this.name || this.name.trim().length === 0,
          message: 'Le nom du type est obligatoire',
        },
        {
          condition: this.name && this.name.length > 100,
          message: 'Le nom du type ne peut pas dépasser 100 caractères',
        },
      ],
    };
  }

  toStorage() {
    return {
      ...super.toStorage(),
      uuid: this.uuid,
      name: this.name,
      parentUuid: this.parent ? this.parent.uuid : null,
    };
  }

  toApi() {
    return {
      ...super.toApi(),
      uuid: this.uuid,
      name: this.name,
      parentUuid: this.parentUuid,
    };
  }
}
