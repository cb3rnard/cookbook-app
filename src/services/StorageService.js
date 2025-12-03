import Dexie from "dexie";
import dexieObservable from "dexie-observable";
import dexieSyncable from "dexie-syncable";

// Configuration de la base de données IndexedDB
class StorageDatabase extends Dexie {
  constructor() {
    super("CookbookDB");

    this.version(1).stores({
      recipes:
        "$$uuid, name, tested, favorite, *tags, timePreparation, timeCook, imageUuid, portions, difficulty, dateAdd, dateModify, version, lastSyncDate, isDirty, dateDeleted",
      ingredients:
        "$$uuid, &name, type, dateAdd, dateModify, version, lastSyncDate, isDirty, dateDeleted",
      recipeIngredients: "$$uuid, ingredientUuid, recipeUuid, quantity, unit",
      types:
        "$$uuid, &name, parentUuid, dateAdd, dateModify, version, lastSyncDate, isDirty, dateDeleted",
      recipeTypes: "$$uuid, recipeUuid, typeUuid",
      images: "$$uuid, name, mimeType, size, dateAdd",
      notes: "$$uuid, recipeUuid, content, dateAdd",
      options: "$$uuid, &key, value",
    });
  }
}

export const storageDatabase = new StorageDatabase("cookbookDB", {
  addons: [dexieObservable, dexieSyncable],
});

export class StorageService {
  // Demander le stockage persistent
  static async requestPersistentStorage() {
    if ("storage" in navigator && "persist" in navigator.storage) {
      try {
        const persistent = await navigator.storage.persist();
        return persistent;
      } catch (error) {
        console.warn(
          "Erreur lors de la demande de stockage persistent:",
          error,
        );
        return false;
      }
    }
    return false;
  }

  // Vérifier l'espace de stockage disponible
  static async getStorageEstimate() {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          quota: estimate.quota,
          usage: estimate.usage,
          usagePercentage: Math.round((estimate.usage / estimate.quota) * 100),
        };
      } catch (error) {
        console.warn("Erreur lors de la vérification du stockage:", error);
        return null;
      }
    }
    return null;
  }

  // Sauvegarder une image
  static async saveImage(file) {
    try {
      const imageData = {
        name: file.name,
        blob: file,
        mimeType: file.type,
        size: file.size,
        dateAdd: new Date(),
      };

      const imageUuid = await database.images.add(imageData);

      return imageUuid;
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de l'image:", error);
      throw error;
    }
  }

  // Récupérer une image par ID
  static async getImage(imageId) {
    try {
      const image = await database.images.get(imageId);
      if (image) {
        // Créer une URL pour afficher l'image
        const imageUrl = URL.createObjectURL(image.blob);
        return {
          ...image,
          url: imageUrl,
        };
      }
      return null;
    } catch (error) {
      console.error("Erreur lors de la récupération de l'image:", error);
      return null;
    }
  }

  // Supprimer une image
  static async deleteImage(imageId) {
    try {
      await database.images.delete(imageId);
      return true;
    } catch (error) {
      console.error("Erreur lors de la suppression de l'image:", error);
      return false;
    }
  }

  // Lister toutes les images
  static async getAllImages() {
    try {
      return await database.images.orderBy("dateAdd").reverse().toArray();
    } catch (error) {
      console.error("Erreur lors de la récupération des images:", error);
      return [];
    }
  }
}
