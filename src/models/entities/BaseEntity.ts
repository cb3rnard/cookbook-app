import { BaseEntityStorage } from '@src/types/storage';
import { ValidationError } from '../../services/utils/ValidationError';
import type { BaseEntityData, ValidationRules } from '../../types/entities';

/**
 * Base model entity
 */
export class BaseEntity {
  uuid: string;
  /**
   * Tracks fields changed after construction
   */
  changed: Set<string>;

  /**
   * @param data Initial data to populate the entity
   */
  constructor(
    data: Partial<BaseEntityData> | Partial<BaseEntityStorage> = {},
    asUpdate: boolean = false,
  ) {
    this.uuid = data.uuid || this.generateUuid();
    this.changed = new Set<string>();
    if (asUpdate) {
      this.markFieldsChanged(Object.keys(data));
    }
  }

  /**
   * Generates a simple UUID v4
   * @returns Generated UUID
   */
  generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
  }

  /**
   * Sets a new UUID for the entity
   */
  setUuid(): void {
    this.uuid = this.generateUuid();
  }

  /**
   * Defines validation rules for the entity
   * Should be overridden by subclasses
   * @returns Validation rules
   */
  validationRules(): ValidationRules {
    return {};
  }

  /**
   * Validates the entity against its rules
   * @param rules Custom rules to validate against
   * @param update If true, only validates provided fields (for updates)
   * @throws ValidationError If validation fails
   * @returns True if validation passes
   */
  validate(rules?: ValidationRules | {}, update: boolean = false): boolean {
    if (!rules) {
      rules = this.validationRules();
    }
    const errors: Array<{ field: string; message: string }> = [];

    for (const [field, conditions] of Object.entries(rules)) {
      // Skip validation for fields not marked as changed during partial updates
      if (update && !this.changed.has(field)) {
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

  get baseFields(): BaseEntityStorage {
    return {
      uuid: this.uuid,
    };
  }

  toData(): BaseEntityData {
    return {
      ...this.baseFields,
    };
  }

  toDataUpdate(): Partial<BaseEntityData> & { uuid: string } {
    const keys = Array.from(this.changed);
    return {
      ...Object.fromEntries(
        keys.map((key) => [key, (this as Record<string, unknown>)[key]]),
      ),
      uuid: this.uuid,
    } as Partial<BaseEntityData> & { uuid: string };
  }

  /**
   * Prepares the entity for local storage
   * @returns Data ready for storage
   */
  toStorage(): BaseEntityStorage {
    return this.baseFields;
  }

  /**
   * Prepares only provided fields for local storage
   * @returns Data ready for storage with uuid always present
   */
  toStorageUpdate(): Partial<BaseEntityStorage> & { uuid: string } {
    const toStorage = this.toStorage();
    const keys = Array.from(this.changed);
    const result = Object.fromEntries(
      keys
        .filter((key) => key in toStorage)
        .map((key) => [key, toStorage[key as keyof BaseEntityStorage]]),
    ) as Partial<BaseEntityStorage>;
    // Ensure uuid is always present
    return { uuid: this.uuid, ...result } as Partial<BaseEntityStorage> & {
      uuid: string;
    };
  }

  toApi(): BaseEntityData {
    return {
      ...this.baseFields,
    };
  }

  /**
   * Marks a field as changed for partial updates
   */
  markChanged(field: string): void {
    if (field && typeof field === 'string') {
      this.changed.add(field);
    }
  }

  /**
   * Marks multiple fields as changed
   */
  markFieldsChanged(fields: string[]): void {
    fields.forEach((f) => this.markChanged(f));
  }

  clearChanged(): void {
    this.changed.clear();
  }

  /**
   * Creates a deep copy of the entity
   * @returns A new instance with the same data
   */
  clone(): this {
    return new (this.constructor as new (data: any) => this)(this.toData());
  }
}
