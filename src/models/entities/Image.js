import { BaseEntity } from './BaseEntity';

export class Image extends BaseEntity {
  constructor(data = {}) {
    super(data);
    this.blob = data.blob || null;
    this.name = data.name || '';
    this.size = data.size || 0;
    this.mimeType = data.mimeType || '';
  }

  /**
   * Règles de validation
   */
  validationRules() {
    return {
      size: [
        {
          condition: this.size && this.size > 10 * 1024 * 1024, // 10MB
          message: 'La taille du fichier ne peut pas dépasser 10MB',
        },
      ],
      mimeType: [
        {
          condition: this.mimeType && !this.mimeType.startsWith('image/'),
          message: 'Le fichier doit être une image',
        },
      ],
    };
  }

  /**
   * Prépare les données pour la sauvegarde
   */
  toStorage() {
    return {
      uuid: this.uuid,
      blob: this.blob,
      name: this.name,
      size: this.size,
      mimeType: this.mimeType,
    };
  }

  /**
   * Prépare les données pour l'API
   */
  toApi() {
    if (!this.blob) {
      throw new Error('No file blob to upload');
    }

    const formData = new FormData();
    formData.append('uuid', JSON.stringify(this.uuid));
    formData.append('name', JSON.stringify(this.name));
    formData.append('size', JSON.stringify(this.size));
    formData.append('mimeType', JSON.stringify(this.mimeType));
    formData.append('file', this.blob);

    return formData;
  }

  /**
   * Vérifie si l'image est valide
   */
  isValidImage() {
    const validMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ];
    return validMimeTypes.includes(this.mimeType);
  }

  /**
   * Calcule le ratio d'aspect
   */
  getAspectRatio() {
    if (this.width && this.height) {
      return this.width / this.height;
    }
    return null;
  }

  /**
   * Formate la taille de fichier
   */
  getFormattedsize() {
    if (this.size === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(this.size) / Math.log(k));

    return parseFloat((this.size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }


}
