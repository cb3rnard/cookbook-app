import { BaseEntity } from "./BaseEntity";

/**
 * Entité modèle synchronisable
 */
export class BaseSyncEntity extends BaseEntity {
  constructor(data = {}) {
    super(data);

    this.dateAdd = data.dateAdd || null;
    this.dateModify = data.dateModify || null;
    this.dateDeleted = data.dateDeleted || null;

    // Champs de synchronisation
    this.version = data.version || 0;
    this.lastSyncDate = data.lastSyncDate || null;

    this.isDirty = data.isDirty ? 1 : 0;
    // L'uuid est défini par le repository à l'enregistrement pour distinguer ajout et édition
    this.uuid = data.uuid || null;
  }

  /**
   * Marque comme synchronisé
   */
  synced(dateSync = null) {
    if (!dateSync) {
      dateSync = new Date().toISOString();
    }
    this.isDirty = 0;
    this.provided.push('isDirty');
    this.lastSyncDate = dateSync;
    this.provided.push('lastSyncDate');
    return this;
  }

  /**
   * Met à jour la date de modification et marque comme dirty
   */
  touch(created = false) {
    if (created && !this.dateAdd) {
      this.dateAdd = new Date().toISOString();
    }
    this.dateModify = new Date().toISOString();
    this.provided.push('dateModify');
    this.isDirty = 1;
    this.provided.push('isDirty');
    this.version = (this.version || 0) + 1;
    this.provided.push('version');
    return this;
  }

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