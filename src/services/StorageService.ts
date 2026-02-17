import dexieObservable from 'dexie-observable';
import dexieSyncable from 'dexie-syncable';
import { StorageDatabase, StorageEstimate } from '../types/storage';

export const storageDatabase = new StorageDatabase('cookbookDB', {
  addons: [dexieObservable, dexieSyncable],
});

export class StorageService {
  /**
   * Request persistent storage
   */
  static async requestPersistentStorage(): Promise<boolean> {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        const persistent = await navigator.storage.persist();
        return persistent;
      } catch (error) {
        console.warn('Error requesting persistent storage:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * Get storage estimate
   */
  static async getStorageEstimate(): Promise<StorageEstimate | undefined> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        if (!estimate.quota || !estimate.usage) return undefined;
        return {
          quota: estimate.quota,
          usage: estimate.usage,
          usagePercentage: Math.round((estimate.usage / estimate.quota) * 100),
        };
      } catch (error) {
        console.warn('Error checking storage:', error);
        return;
      }
    }
    return undefined;
  }
}
