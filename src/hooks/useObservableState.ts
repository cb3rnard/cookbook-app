import { useSyncExternalStore } from 'react';
import { BaseStore } from '../services/stores/BaseStore';

/**
 * Generic hook to subscribe to an ObservableState and get its current state.
 * @param {BaseStore} stateInstance Instance of ObservableState subclass
 * @returns Current state
 */
export function useObservableState<T>(
  stateInstance = null as BaseStore | null,
): T {
  if (!stateInstance) {
    throw new Error('useObservableState: stateInstance is undefined or null');
  }

  return useSyncExternalStore(
    stateInstance.subscribe.bind(stateInstance), // souscription aux changements
    stateInstance.getState.bind(stateInstance), // snapshot de l'état
  ) as T;
}
