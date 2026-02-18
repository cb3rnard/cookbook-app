import { Button, Flex, Heading } from '@radix-ui/themes';
import { Endpoint } from '@src/config/config';
import { EntityData } from '@src/types/entities';
import { EndpointToEntity } from '@src/types/repositories';
import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useData } from '../../contexts/DataContext';
import { isFormChanged } from '../../services/utils/GlobalUtils';
import { ValidationError } from '../../services/utils/ValidationError';
import { Notice } from '../ui/Notice';

const StickyContainer = styled(Flex)`
  position: sticky;
  bottom: 0;
  background: var(--color-background);
  padding: var(--space-6);
  border-top: 1px solid var(--gray-6);
`;

interface EntityFormProps<TEndpoint extends Endpoint = Endpoint> {
  title?: string;
  endpoint: TEndpoint;
  className?: string;
  entity: EndpointToEntity<TEndpoint>;
  onPreSave?: (
    entity: EndpointToEntity<TEndpoint>,
  ) => Promise<EndpointToEntity<TEndpoint>> | EndpointToEntity<TEndpoint>;
  onSave?: (savedEntity: EndpointToEntity<TEndpoint>) => void;
  onCancel?: () => void;
  preventSave?: boolean;
  showCancelButton?: boolean;
  showSaveButton?: boolean;
  children: React.ReactNode;
}

/**
 * Composant de base pour tous les formulaires d'entités
 * Fournit la logique commune : state management, validation, gestion des changements
 */
export function EntityForm<TEndpoint extends Endpoint = Endpoint>({
  title = '',
  endpoint,
  className = '',
  entity,
  onPreSave,
  onSave,
  onCancel,
  preventSave = false,
  showCancelButton = true,
  showSaveButton = true,
  children,
}: EntityFormProps<TEndpoint>) {
  // Helper to extract data from entity or return plain data
  const getFormDataPlain = (
    entity: EndpointToEntity<TEndpoint>,
  ): Partial<EntityData> => {
    return entity.toData();
  };

  const [initialFormData] = useState(getFormDataPlain(entity));
  const currentFormDataPlain = getFormDataPlain(entity);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<
    { field: string; message: string }[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getRepository } = useData();
  const repository = getRepository(endpoint);

  // Détection des changements
  const hasChanges = useMemo(() => {
    return isFormChanged(initialFormData, currentFormDataPlain);
  }, [initialFormData, currentFormDataPlain]);

  // Soumission du formulaire
  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();

    if (!hasChanges) {
      return;
    }
    setError('');
    setValidationErrors([]);
    setIsSubmitting(true);

    try {
      if (!repository) {
        throw new Error('No repository available for saving entity');
      }
      const preSavedEntity = onPreSave ? await onPreSave(entity) : entity;
      if (!preventSave) {
        // TypeScript limitation: cannot guarantee endpoint/entity/repository alignment at compile time
        // The mapping is enforced by EndpointToEntity and EndpointToRepository at usage site
        await (repository as any).save(preSavedEntity);
        onSave?.(preSavedEntity);
      } else {
        onSave?.(preSavedEntity);
      }
      onCancel?.();
    } catch (error) {
      if (error instanceof ValidationError) {
        setValidationErrors(error.errors);
      } else if (error instanceof Error) {
        setError(`Erreur lors de la sauvegarde : ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      {title && (
        <Heading as="h3" size="3" mb="4">
          {title}
        </Heading>
      )}
      {error && <Notice type="error" title={error} mb="4" />}
      {Object.keys(validationErrors).length > 0 && (
        <Notice
          type="warning"
          title="Veuillez corriger les erreurs de validation."
          mb="4"
        >
          <ul>
            {validationErrors.map((error, index) => (
              <li key={index}>
                {error.field}: {error.message}
              </li>
            ))}
          </ul>
        </Notice>
      )}

      <Flex direction="column" gap="4">
        {children}

        <StickyContainer justify="end" gap="2">
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
      </Flex>
    </form>
  );
}
