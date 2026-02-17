import { EntityData } from '@src/types/entities';

export async function delayExecution(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
export function isFormChanged(
  initialFormData: Partial<EntityData>,
  currentFormData: Partial<EntityData>,
): boolean {
  const hasChanged =
    JSON.stringify(initialFormData) !== JSON.stringify(currentFormData);
  return hasChanged;
}

export function getErrorMessage(
  error: unknown,
  defaultMessage = 'Unknown error occurred',
) {
  if (error instanceof Error) {
    return error.message;
  }
  return defaultMessage;
}
