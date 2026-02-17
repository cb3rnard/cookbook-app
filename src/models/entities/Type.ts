import { TypeStorage } from '@src/types/storage';
import type { TypeData, TypeApi, ValidationRules } from '../../types/entities';
import { BaseSyncEntity } from './BaseSyncEntity';

export class Type extends BaseSyncEntity {
  private _name: string;
  private _parentUuid: string;

  constructor(data: Partial<TypeData> = {}, asUpdate: boolean = false) {
    super(data, asUpdate);

    this._name = data.name ? data.name.toLowerCase() : '';
    this._parentUuid = data.parentUuid || '';
  }

  // Getters
  get name(): string {
    return this._name;
  }

  get parentUuid(): string {
    return this._parentUuid;
  }

  // Setters
  set name(value: string) {
    this._name = value.toLowerCase();
    this.markChanged('name');
  }

  set parentUuid(value: string) {
    this._parentUuid = value;
    this.markChanged('parentUuid');
  }

  /**
   * Validation rules
   */
  validationRules(): ValidationRules {
    return {
      name: [
        {
          condition: this.name.trim().length === 0,
          message: 'Type name is required',
        },
        {
          condition: this.name.length > 100,
          message: 'Type name cannot exceed 100 characters',
        },
      ],
    };
  }

  get baseFields(): TypeStorage {
    return {
      ...super.baseFields,
      name: this._name,
      parentUuid: this._parentUuid,
    };
  }

  toStorage(): TypeStorage {
    return this.baseFields;
  }

  toApi(): TypeApi {
    return {
      uuid: this.uuid,
      name: this._name,
      parentUuid: this._parentUuid,
      dateAdd: this.dateAdd,
      dateModify: this.dateModify,
      dateDeleted: this.dateDeleted,
      version: this.version,
    };
  }
}
