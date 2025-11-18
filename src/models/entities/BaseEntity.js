import { ValidationError } from "../../services/utils/ValidationError";

/**
 * Entité modèle
 */
export class BaseEntity {
  static provided = [];

  constructor(data = {}) {
    this.uuid = data.uuid || this.generateUuid();
    this.provided = Object.keys(data);
  }

  /**
   * Génère un UUID v4 simple
   */
  generateUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  setUuid() {
    this.uuid = this.generateUuid();
  }

  validationRules() {
    return {};
  }

  /**
   * Validation d'après les règles fournies
   */
  validate(rules, update = false) {
    if (!rules) {
      rules = this.validationRules();
    }
    const errors = [];
    for (const [field, conditions] of Object.entries(rules)) {
      // Saute la validation des champs non fournis lors d'une mise à jour partielle
      if (update && typeof (this.provided[field]) === 'undefined') {
        continue;
      }
      for (const { condition, message } of conditions) {
        if (condition) {
          errors.push({ field, message });
        }
      }
    }

    if (errors && errors.length > 0) {
      console.error(errors);
      throw new ValidationError(errors);
    }
    return true;
  }


  /**
   * Clone l'entité
   */
  clone() {
    return new this.constructor(JSON.parse(JSON.stringify(this)));
  }

  /**
   * Prépare pour le stockage local
   */
  toStorage() {
    return {
      uuid: this.uuid,
    };
  }

  toStorageUpdate() {
    return this.provided.reduce((obj, key) => {
      obj[key] = this[key];
      return obj;
    }, {});
  }

  /**
   * Prépare pour l'API
   */
  toApi() {
    return {
      uuid: this.uuid,
    };
  }
}