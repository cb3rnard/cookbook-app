import { ValidationError } from "../../services/utils/ValidationError";

/**
 * Base model entity
 */
export class BaseEntity {
  static provided = [];

  /**
   * @param {Object} data Initial data to populate the entity
   */
  constructor(data = {}) {
    this.uuid = data.uuid || this.generateUuid();
    this.provided = Object.keys(data);
  }

  /**
   * Generates a simple UUID v4
   * @returns {string} Generated UUID
   *
   */
  generateUuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
  }

  /**
   * Sets a new UUID for the entity
   */
  setUuid() {
    this.uuid = this.generateUuid();
  }

  /**
   * Defines validation rules for the entity
   * Should be overridden by subclasses
   * @returns {Object} Validation rules
   */
  validationRules() {
    return {};
  }

  /**
   * Validates the entity against its rules
   * @param {Object|null} rules Custom rules to validate against
   * @param {boolean} update If true, only validates provided fields (for updates)
   * @throws {ValidationError} If validation fails
   * @return {boolean} True if validation passes
   */
  validate(rules, update = false) {
    if (!rules) {
      rules = this.validationRules();
    }
    const errors = [];
    for (const [field, conditions] of Object.entries(rules)) {
      // Saute la validation des champs non fournis lors d'une mise à jour partielle
      if (update && typeof this.provided[field] === "undefined") {
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
   * Clones the entity
   * @returns {BaseEntity} Cloned entity
   */
  clone() {
    return new this.constructor(JSON.parse(JSON.stringify(this)));
  }

  /**
   * Prepares the entity for local storage
   * @returns {Object} Data ready for storage
   */
  toStorage() {
    return {
      uuid: this.uuid,
    };
  }

  /**
   * Prepares only provided fields for local storage
   * @returns {Object} Data ready for storage
   */
  toStorageUpdate() {
    return this.provided.reduce((obj, key) => {
      obj[key] = this[key];
      return obj;
    }, {});
  }

  /**
   * Prepares the entity for the API
   * @returns {Object} Data ready for the API
   */
  toApi() {
    return {
      uuid: this.uuid,
    };
  }
}
