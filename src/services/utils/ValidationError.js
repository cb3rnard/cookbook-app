export class ValidationError extends Error {
    constructor(errors = {}) {
        super('Validation failed');
        this.name = 'ValidationError';
        this.errors = errors; // Détails des erreurs de validation
    }
}