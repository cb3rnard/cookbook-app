export class ValidationError extends Error {
  errors: { field: string; message: string }[];

  constructor(errors: { field: string; message: string }[] = []) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.errors = errors; // Détails des erreurs de validation
  }
}
