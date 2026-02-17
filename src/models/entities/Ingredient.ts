import { IngredientStorage } from '@src/types/storage';
import type {
  IngredientData,
  IngredientApi,
  ValidationRules,
} from '../../types/entities';
import { BaseSyncEntity } from './BaseSyncEntity';

export class Ingredient extends BaseSyncEntity {
  private _name: string;
  private _type: string;
  private _excludeFromFilters: number;

  constructor(data: Partial<IngredientData> = {}, asUpdate: boolean = false) {
    super(data, asUpdate);

    this._name = data.name ? data.name.toLowerCase() : '';
    this._type = data.type || '';
    this._excludeFromFilters = data.excludeFromFilters || 0;
  }

  // Getters
  get name(): string {
    return this._name;
  }

  get type(): string {
    return this._type;
  }

  get excludeFromFilters(): number {
    return this._excludeFromFilters;
  }

  // Setters
  set name(value: string) {
    this._name = value.toLowerCase();
    this.markChanged('name');
  }

  set type(value: string) {
    this._type = value;
    this.markChanged('type');
  }

  set excludeFromFilters(value: number) {
    this._excludeFromFilters = value;
    this.markChanged('excludeFromFilters');
  }

  /**
   * Validation rules
   */
  validationRules(): ValidationRules {
    return {
      name: [
        {
          condition: this.name.trim().length === 0,
          message: 'Ingredient name is required',
        },
        {
          condition: this.name.length > 100,
          message: 'Ingredient name cannot exceed 100 characters',
        },
      ],
      type: [
        {
          condition: this.type.length > 50,
          message: 'Type cannot exceed 50 characters',
        },
      ],
    };
  }

  get baseFields(): IngredientStorage {
    return {
      ...super.baseFields,
      name: this._name,
      type: this._type,
      excludeFromFilters: this._excludeFromFilters,
    };
  }

  toStorage(): IngredientStorage {
    return this.baseFields;
  }

  /**
   * Prepares data for API
   */
  toApi(): IngredientApi {
    return {
      uuid: this.uuid,
      name: this._name,
      type: this._type,
      excludeFromFilters: this._excludeFromFilters,
      dateAdd: this.dateAdd,
      dateModify: this.dateModify,
      dateDeleted: this.dateDeleted,
      version: this.version,
    };
  }
}
