import { ImageStorage } from '@src/types/storage';
import type { ImageData, ValidationRules } from '../../types/entities';
import { BaseEntity } from './BaseEntity';

export class Image extends BaseEntity {
  private _blob: Blob | null;
  private _size: number;
  private _mimeType: string;

  constructor(data: Partial<ImageData> = {}, asUpdate: boolean = false) {
    super(data, asUpdate);
    this._blob = data.blob || null;
    this._size = data.size || 0;
    this._mimeType = data.mimeType || '';
  }

  // Getters
  get blob(): Blob | null {
    return this._blob;
  }

  get size(): number {
    return this._size;
  }

  get mimeType(): string {
    return this._mimeType;
  }

  // Setters
  set blob(value: Blob | null) {
    this._blob = value;
    this.markChanged('blob');
  }

  set size(value: number) {
    this._size = value;
    this.markChanged('size');
  }

  set mimeType(value: string) {
    this._mimeType = value;
    this.markChanged('mimeType');
  }

  /**
   * Validation rules
   */
  validationRules(): ValidationRules {
    return {
      size: [
        {
          condition: this.size > 10 * 1024 * 1024, // 10MB
          message: 'File size cannot exceed 10MB',
        },
      ],
      mimeType: [
        {
          condition: Boolean(
            this.mimeType && !this.mimeType.startsWith('image/'),
          ),
          message: 'File must be an image',
        },
      ],
    };
  }

  get baseFields(): ImageStorage {
    return {
      ...super.baseFields,
      blob: this._blob,
      size: this._size,
      mimeType: this._mimeType,
    };
  }

  toStorage(): ImageStorage {
    return this.baseFields;
  }

  /**
   * Checks if image is valid
   */
  isValidImage(): boolean {
    const validMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ];
    return validMimeTypes.includes(this._mimeType);
  }

  /**
   * Formats file size
   */
  getFormattedSize(): string {
    if (this._size === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(this._size) / Math.log(k));

    return (
      parseFloat((this._size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    );
  }
}
