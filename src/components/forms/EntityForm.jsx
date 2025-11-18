import { Button, Flex, Heading } from '@radix-ui/themes';
import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useData } from '../../contexts/DataContext';
import { isFormChanged } from '../../services/utils/GlobalUtils';
import { ValidationError } from '../../services/utils/ValidationError';
import { Notice } from '../ui/Notice';

const StickyContainer = styled(Flex)`
    position: sticky;
    bottom: 0;
    background: var(--color-white);
    padding: var(--space-6);
  `;

/**
 * Composant de base pour tous les formulaires d'entités
 * Fournit la logique commune : state management, validation, gestion des changements
 */
export function EntityForm({
  title,
  endpoint = null,
  className = '',
  formData = {},
  onPreSave = null,
  onSave = null,
  onCancel = null,
  preventSave = false,
  showCancelButton = true,
  showSaveButton = true,
  extraButtons = null,
  children,
}) {
  const [initialFormData] = useState(formData);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getRepository } = useData();
  const repository = getRepository(endpoint);

  // Détection des changements
  const hasChanges = useMemo(() => {
    return isFormChanged(initialFormData, formData);
  }, [initialFormData, formData]);

  // Soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!hasChanges) {
      return;
    }
    setError(null);
    setValidationErrors([]);
    setIsSubmitting(true);

    try {
      if (!repository) {
        throw new Error('No repository available for saving entity');
      }
      const preSavedData = onPreSave ? await onPreSave(formData) : formData;
      if (!preventSave) {
        const savedEntity = await repository.save(preSavedData);
        ('Entity saved:', savedEntity);
        onSave?.(savedEntity);
      } else {
        onSave?.(preSavedData);
      }
      onCancel?.();
    } catch (error) {
      if (error instanceof ValidationError) {
        setValidationErrors(error.errors);
      } else {
        setError(`Erreur lors de la sauvegarde : ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      {title && (
        <Heading as="h3" size="3" mb="4">{title}</Heading>
      )}
      {error && (
        <Notice type="error" title={error} mb="4" />
      )}
      {validationErrors.length > 0 && (
        <Notice type="warning" title="Veuillez corriger les erreurs de validation." mb="4">
          <ul>
            {validationErrors.map((error, index) => (
              <li key={index}>{error.field}: {error.message}</li>
            ))}
          </ul>
        </Notice>
      )}

      <Flex direction="column" gap="4">
        {children}

        <StickyContainer justify="end" gap="2">
          {extraButtons}
          {showCancelButton && (
            <Button
              type="button"
              variant="soft"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
          )}
          {showSaveButton && (
            <Button
              type="submit"
              disabled={!hasChanges || isSubmitting}
              loading={isSubmitting}
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          )}
        </StickyContainer>
      </Flex >
    </form >
  );
};