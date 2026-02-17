import { NoteStorage } from '@src/types/storage';
import type { NoteData, ValidationRules } from '../../types/entities';
import { BaseEntity } from './BaseEntity';

export class Note extends BaseEntity {
  private _content: string;
  private _recipeUuid: string;
  private _dateAdd: string;

  constructor(data: Partial<NoteData> = {}, asUpdate: boolean = false) {
    super(data, asUpdate);
    this._content = data.content || '';
    this._recipeUuid = data.recipeUuid || '';
    this._dateAdd = data.dateAdd || new Date().toISOString();
  }

  // Getters
  get content(): string {
    return this._content;
  }

  get recipeUuid(): string {
    return this._recipeUuid;
  }

  get dateAdd(): string {
    return this._dateAdd;
  }

  // Setters
  set content(value: string) {
    this._content = value;
    this.markChanged('content');
  }

  set recipeUuid(value: string) {
    this._recipeUuid = value;
    this.markChanged('recipeUuid');
  }

  set dateAdd(value: string) {
    this._dateAdd = value;
    this.markChanged('dateAdd');
  }

  /**
   * Validation rules
   */
  validationRules(): ValidationRules {
    return {
      content: [
        {
          condition: !this.content || this.content.trim().length === 0,
          message: 'Note content is required',
        },
        {
          condition: this.content.length > 500,
          message: 'Note content cannot exceed 500 characters',
        },
      ],
      recipeUuid: [
        {
          condition: !this.recipeUuid,
          message: 'Note must be associated with a recipe',
        },
      ],
    };
  }

  get baseFields(): NoteStorage {
    return {
      uuid: this.uuid,
      content: this._content,
      recipeUuid: this._recipeUuid,
      dateAdd: this._dateAdd,
    };
  }

  toStorage(): NoteStorage {
    return this.baseFields;
  }
}
