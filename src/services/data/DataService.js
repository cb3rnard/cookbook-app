import { ApiService } from "../api/ApiService.js";
import { storageDatabase as database } from "../StorageService.js";
import { ConnectionStore } from "../stores/ConnectionStore.js";
import { DataStore } from "../stores/DataStore.js";
import { SyncService } from "../sync/SyncService.js";
import { EventBus } from "../utils/EventBus.js";
import { ImageRepository } from "./repositories/ImageRepository.js";
import { IngredientRepository } from "./repositories/IngredientRepository.js";
import { NoteRepository } from "./repositories/NoteRepository.js";
import { RecipeRepository } from "./repositories/RecipeRepository.js";
import { TypeRepository } from "./repositories/TypeRepository.js";

/**
 * Service central pour l'accès aux données
 */

const countsModel = {
  all: { recipes: 0, ingredients: 0, types: 0 },
  deleted: { recipes: 0, ingredients: 0, types: 0 },
  modified: { recipes: 0, ingredients: 0, types: 0 },
  hasChanges: false,
};

export class DataService {
  static _instance = null;

  constructor() {
    if (DataService._instance) {
      return DataService._instance;
    }
    this.apiService = new ApiService();

    this.repositories = new Map();
    this.eventBus = EventBus.getInstance();
    this.connectionStore = new ConnectionStore();

    this.sessionStore = this.connectionStore.state.session;

    this.dataStore = new DataStore();
    this._setupRepositories();

    // Créer SyncService avec les repositories configurés
    this.syncService = new SyncService(this.repositories, this.apiService);
    DataService._instance = this;
    this.refreshLocalCounts();
  }

  // Direct repositories access
  get recipes() {
    return this.repositories.get("recipes");
  }

  get ingredients() {
    return this.repositories.get("ingredients");
  }

  get types() {
    return this.repositories.get("types");
  }

  get images() {
    return this.repositories.get("images");
  }

  get notes() {
    return this.repositories.get("notes");
  }

  /**
   * Configuration des repositories pour chaque type d'entité
   */
  _setupRepositories() {
    const repositoryClasses = [
      RecipeRepository,
      IngredientRepository,
      TypeRepository,
      ImageRepository,
      NoteRepository,
    ];

    const repositoryInstances = repositoryClasses.map(
      (RepositoryClass) => new RepositoryClass(database),
    );

    // Create set from endpoints and Repository instances
    const repositoryRegistry = new Map();
    repositoryInstances.forEach((repo) => {
      repositoryRegistry.set(repo.endpoint, repo);
    });
    this.repositories = repositoryRegistry;

    repositoryInstances.forEach((repo) => {
      repo.setRepositoriesRegistry(repositoryRegistry);
    });
  }

  // Méthode générique (backward compatibility)
  getRepository(endpoint) {
    return this.repositories.get(endpoint);
  }

  async refreshAllCounts() {
    await this.refreshLocalCounts();
    await this.refreshRemoteCounts();
  }

  async refreshLocalCounts() {
    try {
      this.dataStore.setState({
        localCounts: {
          ...this.dataStore.state.localCounts,
          loading: true,
          error: null,
        },
      });
      const counts = { ...countsModel };
      counts.all = {
        recipes: await this.recipes.count(),
        ingredients: await this.ingredients.count(),
        types: await this.types.count(),
      };

      if (this.sessionStore.state.active) {
        const endpoints = ["recipes", "ingredients", "types"];
        for (const endpoint of endpoints) {
          const repository = this.repositories.get(endpoint);
          counts.deleted[endpoint] = await repository.countDirtyDeleted();
          counts.modified[endpoint] = await repository.countDirtyModified();
        }

        counts.hasChanges =
          counts.modified.recipes > 0 ||
          counts.modified.ingredients > 0 ||
          counts.modified.types > 0 ||
          counts.deleted.recipes > 0 ||
          counts.deleted.ingredients > 0 ||
          counts.deleted.types > 0;
      }

      this.dataStore.setState({
        localCounts: {
          ...counts,
          loading: false,
          error: null,
          available: true,
        },
      });
    } catch (error) {
      console.error("Failed to get local counts:", error);
      this.dataStore.setState({
        localCounts: {
          ...this.dataStore._state.localCounts,
          loading: false,
          error: {
            title: "Données indisponibles",
            message: "Impossible de récupérer les données locales.",
          },
        },
      });
    }
  }

  async refreshRemoteCounts() {
    try {
      if (this.connectionStore.online !== true) {
        throw new Error("Offline", { offline: true });
      }
      if (this.connectionStore.available !== true) {
        throw new Error("API Unavailable", { apiUnavailable: true });
      }
      this.dataStore.setState({
        remoteCounts: {
          ...this.dataStore._state.remoteCounts,
          loading: true,
          error: null,
        },
      });
      const counts = { ...countsModel };
      counts.all = await this.apiService.operations.global.getRemoteCounts();

      const dirtyVersionsEndpoints =
        await this.apiService.operations.global.getDirtyEntitiesVersions();
      const dirtyVersions = [];

      for (const [endpoint, versions] of Object.entries(
        dirtyVersionsEndpoints,
      )) {
        counts.deleted[endpoint] = 0;
        counts.modified[endpoint] = 0;
        for (const version of versions) {
          if (version.dateDeleted) {
            counts.deleted[endpoint]++;
          } else {
            counts.modified[endpoint]++;
          }
          dirtyVersions.push(version);
        }
      }
      const adjustedCounts = await this._excludeSyncedFromDirtyCounts(
        counts,
        dirtyVersions,
      );

      adjustedCounts.hasChanges =
        adjustedCounts.modified.recipes > 0 ||
        adjustedCounts.modified.ingredients > 0 ||
        adjustedCounts.modified.types > 0 ||
        adjustedCounts.deleted.recipes > 0 ||
        adjustedCounts.deleted.ingredients > 0 ||
        adjustedCounts.deleted.types > 0;

      this.dataStore.setState({
        remoteCounts: {
          ...adjustedCounts,
          loading: false,
          error: null,
          available: true,
        },
      });
    } catch (error) {
      console.error("Failed to get remote counts:", error);
      this.dataStore.setState({
        remoteCounts: {
          ...this.dataStore.state.remoteCounts,
          loading: false,
          error: {
            title: error.offline
              ? "Hors ligne"
              : error.apiUnavailable
                ? "Serveur indisponible"
                : "Erreur serveur",
            message: "Impossible de récupérer les données distantes.",
          },
          loading: false,
        },
      });
    }
  }

  // Iterates through
  async _excludeSyncedFromDirtyCounts(counts, remoteDirtyVersions) {
    const adjustedCounts = { ...counts };
    for (const remoteVersion of remoteDirtyVersions.entries()) {
      const repository = this.repositories.get(remoteVersion.endpoint);
      if (!repository) continue;
      const isSynced = await repository.isSynced(
        remoteVersion.uuid,
        remoteVersion.dateReceived,
      );
      if (isSynced) {
        if (remoteVersion.dateDeleted) {
          adjustedCounts.deleted[remoteVersion.endpoint] = Math.max(
            0,
            adjustedCounts.deleted[remoteVersion.endpoint] - 1,
          );
        } else {
          adjustedCounts.modified[remoteVersion.endpoint] = Math.max(
            0,
            adjustedCounts.modified[remoteVersion.endpoint] - 1,
          );
        }
      }
    }
    return adjustedCounts;
  }
}
