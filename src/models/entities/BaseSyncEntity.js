import { BaseEntity } from "./BaseEntity";

/**
 * Base sync model entity
 */
export class BaseSyncEntity extends BaseEntity {
  constructor(data = {}) {
    super(data);

    this.dateAdd = data.dateAdd || null;
    this.dateModify = data.dateModify || null;
    this.dateDeleted = data.dateDeleted || null;

    // Synchronization fields
    this.version = data.version || 0;
    this.lastSyncDate = data.lastSyncDate || null;

    this.isDirty = data.isDirty ? 1 : 0;
    // The uuid is set by the repository upon saving to distinguish between addition and edition
    this.uuid = data.uuid || null;
  }

  /**
   * Marks as synced
   * @param {string|null} dateSync Date of synchronization
   * @returns {BaseSyncEntity} The updated entity
   */
  synced(dateSync = null) {
    if (!dateSync || typeof dateSync !== "string") {
      dateSync = new Date().toISOString();
    }
    this.isDirty = 0;
    this.provided.push("isDirty");
    this.lastSyncDate = dateSync;
    this.provided.push("lastSyncDate");
    return this;
  }

  /**
   * Updates the modification date and marks as dirty
   * @param {boolean} created If true, sets the creation date if not already set
   * @returns {BaseSyncEntity} The updated entity
   */
  touch(created = false) {
    if (created && !this.dateAdd) {
      this.dateAdd = new Date().toISOString();
    }
    this.dateModify = new Date().toISOString();
    this.provided.push("dateModify");
    this.isDirty = 1;
    this.provided.push("isDirty");
    this.version = (this.version || 0) + 1;
    this.provided.push("version");
    return this;
  }

  /**
   * Prepares the entity for local storage
   * @returns {Object} Data ready for storage
   */
  toStorage() {
    return {
      ...super.toStorage(),
      dateAdd: this.dateAdd,
      dateModify: this.dateModify,
      dateDeleted: this.dateDeleted,
      version: this.version,
      lastSyncDate: this.lastSyncDate,
      isDirty: this.isDirty,
    };
  }

  /**
   * Prepares the entity for the API
   * @returns {Object} Data ready for the API
   */
  toApi() {
    return {
      ...super.toStorage(),
      dateAdd: this.dateAdd,
      dateModify: this.dateModify,
      dateDeleted: this.dateDeleted,
      version: this.version,
      lastSyncDate: this.lastSyncDate,
    };
  }
}
