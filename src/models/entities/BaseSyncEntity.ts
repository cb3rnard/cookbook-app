import { BaseSyncEntityStorage } from '@src/types/storage';
import type {
  BaseSyncEntityApi,
  BaseSyncEntityData,
} from '../../types/entities';
import { BaseEntity } from './BaseEntity';

export interface SyncedResult {
  lastSyncDate: string;
  isDirty: number;
}

/**
 * Base sync model entity
 */
export class BaseSyncEntity extends BaseEntity {
  dateAdd: string;
  dateModify: string;
  dateDeleted: string;
  version: number;
  lastSyncDate: string;
  isDirty: number;

  constructor(
    data: Partial<BaseSyncEntityData> | Partial<BaseSyncEntityStorage> = {},
    asUpdate: boolean = false,
  ) {
    super(data, asUpdate);
    this.uuid = data.uuid || '';

    this.dateAdd = data.dateAdd || '';
    this.dateModify = data.dateModify || '';
    this.dateDeleted = data.dateDeleted || '';

    // Synchronization fields
    this.version = data.version || 0;
    this.lastSyncDate = data.lastSyncDate || '';

    this.isDirty = data.isDirty ? 1 : 0;
  }

  /**
   * Marks as synced
   * @param dateSync Date of synchronization
   * @returns The updated entity
   */
  synced(dateSync: string): SyncedResult {
    if (!dateSync || typeof dateSync !== 'string') {
      dateSync = new Date().toISOString();
    }
    this.isDirty = 0;
    this.markChanged('isDirty');
    this.lastSyncDate = dateSync;
    this.markChanged('lastSyncDate');
    return {
      lastSyncDate: this.lastSyncDate,
      isDirty: this.isDirty,
    };
  }

  /**
   * Updates the modification date and marks as dirty
   * @param created If true, sets the creation date if not already set
   * @returns The updated entity
   */
  touch(created: boolean = false, dirtyOnly: boolean = false): void {
    if (!dirtyOnly) {
      if (created && !this.dateAdd) {
        this.dateAdd = new Date().toISOString();
        this.markChanged('dateAdd');
      }
      this.dateModify = new Date().toISOString();
      this.markChanged('dateModify');
      this.version = (this.version || 0) + 1;
      this.markChanged('version');
    }
    this.isDirty = 1;
    this.markChanged('isDirty');
  }

  get baseFields(): BaseSyncEntityStorage {
    return {
      uuid: this.uuid,
      dateAdd: this.dateAdd,
      dateModify: this.dateModify,
      dateDeleted: this.dateDeleted,
      version: this.version,
      lastSyncDate: this.lastSyncDate,
      isDirty: this.isDirty,
    };
  }

  toData(): BaseSyncEntityData {
    return {
      ...this.baseFields,
    };
  }

  /**
   * Prepares the entity for local storage
   * @returns Data ready for storage
   */
  toStorage(): BaseSyncEntityStorage {
    return this.baseFields;
  }

  /**
   * Prepares the entity for the API
   * @returns Data ready for the API
   */
  toApi(): BaseSyncEntityApi {
    return {
      ...super.toStorage(),
      // Exclude isDirty and lastSyncDate from API representation
      dateAdd: this.dateAdd,
      dateModify: this.dateModify,
      dateDeleted: this.dateDeleted,
      version: this.version,
    };
  }
}
