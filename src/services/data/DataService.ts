import { config, Endpoint, EndpointSyncable } from '@src/config/config.ts';
import { countsModel } from '@src/types/data.ts';
import { Entity } from '@src/types/entities.ts';
import { RepositoriesMap, Repository } from '@src/types/repositories.ts';
import { ApiService } from '../api/ApiService.js';
import { DebugService } from '../DebugService.ts';
import { ConnectionStore } from '../stores/ConnectionStore.js';
import { DataStore } from '../stores/DataStore.js';
import { SessionStore } from '../stores/SessionStore.ts';
import { SyncService } from '../sync/SyncService.js';
import { EventBus } from '../utils/EventBus.ts';
import { ImageRepository } from './repositories/ImageRepository.js';
import { IngredientRepository } from './repositories/IngredientRepository.js';
import { NoteRepository } from './repositories/NoteRepository.js';
import { RecipeRepository } from './repositories/RecipeRepository.js';
import { TypeRepository } from './repositories/TypeRepository.js';

/**
 * Service central pour l'accès aux données
 */

class ConnectionError extends Error {
  reason: 'offline' | 'apiUnavailable';

  constructor(message: string, reason: 'offline' | 'apiUnavailable') {
    super(message);
    this.reason = reason;
  }
}

type LocalEntityStatus = {
  present: boolean;
  dirty: 'clean' | 'created' | 'modified' | 'deleted';
};

export class DataService {
  static _instance: DataService | null = null;
  apiService!: ApiService;
  repositories!: RepositoriesMap;
  eventBus!: EventBus;
  dataStore!: DataStore;
  connectionStore!: ConnectionStore;
  sessionStore!: SessionStore;
  syncService!: SyncService;
  _localEntityStates: Map<Endpoint, Map<string, LocalEntityStatus>> = new Map();

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
    this._setupCountsListeners();
    DataService._instance = this;
  }

  // Direct repositories access with type casting (necessary with Map)
  get recipes(): RecipeRepository {
    return this.repositories.get(
      config.ENDPOINTS_CONSTANTS.RECIPES,
    ) as RecipeRepository;
  }

  get ingredients(): IngredientRepository {
    return this.repositories.get(
      config.ENDPOINTS_CONSTANTS.INGREDIENTS,
    ) as IngredientRepository;
  }

  get types(): TypeRepository {
    return this.repositories.get(
      config.ENDPOINTS_CONSTANTS.TYPES,
    ) as TypeRepository;
  }

  get images(): ImageRepository {
    return this.repositories.get(
      config.ENDPOINTS_CONSTANTS.IMAGES,
    ) as ImageRepository;
  }

  get notes(): NoteRepository {
    return this.repositories.get(
      config.ENDPOINTS_CONSTANTS.NOTES,
    ) as NoteRepository;
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

    // Create repository instances
    const repositoryInstances = repositoryClasses.map(
      (RepositoryClass) => new RepositoryClass(),
    );

    // Populate the repositories map
    repositoryInstances.forEach((repo) => {
      this.repositories.set(repo.endpoint as Endpoint, repo);
    });

    // Inject the complete registry into each repository
    repositoryInstances.forEach((repo) => {
      repo.setRepositoriesRegistry(this.repositories as Map<Endpoint, any>);
    });
  }

  _setupCountsListeners() {
    this.eventBus.on('entity:saved', (payload) => {
      this._handleEntitySaved(payload);
    });
    this.eventBus.on('entity:updated', (payload) => {
      this._handleEntityUpdated(payload);
    });
    this.eventBus.on('entity:deleted', (payload) => {
      this._handleEntityDeleted(payload);
    });
    this.eventBus.on('entity:synced', (payload) => {
      this._handleEntitySynced(payload);
    });
  }

  _shouldSkipLocalCountsUpdate(): boolean {
    return this.syncService?.syncStore?.syncing === true;
  }

  _isSyncableEndpoint(endpoint: Endpoint): boolean {
    return config.ENDPOINTS_SYNCABLE.includes(endpoint as any);
  }

  _getEntityStatus(entity: Entity): LocalEntityStatus {
    const dateDeleted = (entity as any).dateDeleted as string | undefined;
    const isDirty = Number((entity as any).isDirty || 0);
    const lastSyncDate = String((entity as any).lastSyncDate || '');
    const deleted = Boolean(dateDeleted);

    if (!isDirty) {
      return { present: !deleted, dirty: 'clean' };
    }

    if (deleted) {
      return { present: false, dirty: 'deleted' };
    }

    if (!lastSyncDate) {
      return { present: true, dirty: 'created' };
    }

    return { present: true, dirty: 'modified' };
  }

  _getEntityStateMap(endpoint: Endpoint): Map<string, LocalEntityStatus> {
    const existing = this._localEntityStates.get(endpoint);
    if (existing) return existing;
    const created = new Map<string, LocalEntityStatus>();
    this._localEntityStates.set(endpoint, created);
    return created;
  }

  _applyLocalCountsTransition(
    endpoint: EndpointSyncable,
    previous: LocalEntityStatus | null,
    next: LocalEntityStatus | null,
  ) {
    const current = this.dataStore.state.localCounts;
    const updatedAll = { ...current.all };
    const updatedCreated = { ...current.created };
    const updatedModified = { ...current.modified };
    const updatedDeleted = { ...current.deleted };

    const wasPresent = previous?.present === true;
    const isPresent = next?.present === true;

    if (wasPresent !== isPresent) {
      const delta = isPresent ? 1 : -1;
      const currentValue = updatedAll[endpoint] || 0;
      updatedAll[endpoint] = Math.max(0, currentValue + delta);
    }

    if (this.sessionStore.state.active) {
      const prevDirty = previous?.dirty;
      const nextDirty = next?.dirty;

      if (prevDirty === 'created') {
        updatedCreated[endpoint] = Math.max(
          0,
          (updatedCreated[endpoint] || 0) - 1,
        );
      } else if (prevDirty === 'modified') {
        updatedModified[endpoint] = Math.max(
          0,
          (updatedModified[endpoint] || 0) - 1,
        );
      } else if (prevDirty === 'deleted') {
        updatedDeleted[endpoint] = Math.max(
          0,
          (updatedDeleted[endpoint] || 0) - 1,
        );
      }

      if (nextDirty === 'created') {
        updatedCreated[endpoint] = (updatedCreated[endpoint] || 0) + 1;
      } else if (nextDirty === 'modified') {
        updatedModified[endpoint] = (updatedModified[endpoint] || 0) + 1;
      } else if (nextDirty === 'deleted') {
        updatedDeleted[endpoint] = (updatedDeleted[endpoint] || 0) + 1;
      }
    }

    const hasChanges = this.sessionStore.state.active
      ? (updatedCreated.recipes || 0) +
          (updatedCreated.ingredients || 0) +
          (updatedCreated.types || 0) +
          (updatedModified.recipes || 0) +
          (updatedModified.ingredients || 0) +
          (updatedModified.types || 0) +
          (updatedDeleted.recipes || 0) +
          (updatedDeleted.ingredients || 0) +
          (updatedDeleted.types || 0) >
        0
      : current.hasChanges;

    this.dataStore.setState({
      localCounts: {
        ...current,
        all: updatedAll,
        created: updatedCreated,
        modified: updatedModified,
        deleted: updatedDeleted,
        hasChanges,
      },
    });
  }

  _handleEntitySaved(payload: { endpoint: Endpoint; entity: Entity }) {
    const skipCounts = this._shouldSkipLocalCountsUpdate();
    const { endpoint, entity } = payload;
    if (!this._isSyncableEndpoint(endpoint)) return;

    const nextStatus = this._getEntityStatus(entity);
    const stateMap = this._getEntityStateMap(endpoint);
    const previous = stateMap.get(entity.uuid) || null;
    if (!skipCounts) {
      this._applyLocalCountsTransition(
        endpoint as EndpointSyncable,
        previous,
        nextStatus,
      );
    }
    stateMap.set(entity.uuid, nextStatus);
  }

  _handleEntityUpdated(payload: {
    endpoint: Endpoint;
    entityData: { uuid: string };
    entity?: Entity;
  }) {
    const skipCounts = this._shouldSkipLocalCountsUpdate();
    const { endpoint, entityData, entity } = payload;
    if (!this._isSyncableEndpoint(endpoint)) return;
    if (!entity?.uuid && !entityData?.uuid) return;

    const stateMap = this._getEntityStateMap(endpoint);
    const key = entity?.uuid || entityData.uuid;
    const previous = stateMap.get(key) || { present: true, dirty: 'clean' };
    if (!entity) return;

    const nextStatus = this._getEntityStatus(entity);
    if (!skipCounts) {
      this._applyLocalCountsTransition(
        endpoint as EndpointSyncable,
        previous,
        nextStatus,
      );
    }
    stateMap.set(key, nextStatus);
  }

  _handleEntityDeleted(payload: { endpoint: Endpoint; uuid: string }) {
    const skipCounts = this._shouldSkipLocalCountsUpdate();
    const { endpoint, uuid } = payload;
    if (!this._isSyncableEndpoint(endpoint)) return;

    const stateMap = this._getEntityStateMap(endpoint);
    const previous = stateMap.get(uuid) || null;
    if (!skipCounts) {
      this._applyLocalCountsTransition(
        endpoint as EndpointSyncable,
        previous,
        null,
      );
    }
    stateMap.delete(uuid);
  }

  _handleEntitySynced(payload: {
    endpoint: Endpoint;
    uuid: string;
    lastSyncDate: string;
  }) {
    const skipCounts = this._shouldSkipLocalCountsUpdate();
    const { endpoint, uuid } = payload;
    if (!this._isSyncableEndpoint(endpoint)) return;

    const stateMap = this._getEntityStateMap(endpoint);
    const previous = stateMap.get(uuid);
    if (!previous) return;

    const nextStatus: LocalEntityStatus = {
      present: previous.present,
      dirty: 'clean',
    };

    if (!skipCounts) {
      this._applyLocalCountsTransition(
        endpoint as EndpointSyncable,
        previous,
        nextStatus,
      );
    }
    stateMap.set(uuid, nextStatus);
  }

  // Méthode générique simple
  getRepository(endpoint: Endpoint): Repository {
    return this.repositories.get(endpoint)!;
  }

  async refreshAllCounts() {
    await this.refreshLocalCounts();
    await this.refreshRemoteCounts();
  }

  async refreshLocalCounts() {
    DebugService.log('api', 'DataService: Refreshing local counts');

    try {
      this.dataStore.setState({
        localCounts: {
          ...this.dataStore.state.localCounts,
          loading: true,
          error: null,
        },
      });
      const counts = structuredClone(countsModel);
      counts.all = {
        recipes: await this.recipes!.count(),
        ingredients: await this.ingredients!.count(),
        types: await this.types!.count(),
      };

      if (this.sessionStore.state.active) {
        for (const endpoint of config.ENDPOINTS_SYNCABLE) {
          const repository = this.repositories.get(endpoint);
          if (!repository) {
            throw new Error(`Repository not found for endpoint: ${endpoint}`);
          }
          counts.deleted[endpoint] = await repository.countDirtyDeleted();
          counts.created[endpoint] = await repository.countDirtyNew();
          const dirtyModifiedCount = await repository.countDirtyModified();
          counts.modified[endpoint] = Math.max(
            0,
            dirtyModifiedCount - counts.created[endpoint],
          );
        }

        counts.hasChanges =
          counts.created.recipes > 0 ||
          counts.created.ingredients > 0 ||
          counts.created.types > 0 ||
          counts.modified.recipes > 0 ||
          counts.modified.ingredients > 0 ||
          counts.modified.types > 0 ||
          counts.deleted.recipes > 0 ||
          counts.deleted.ingredients > 0 ||
          counts.deleted.types > 0;
      }

      counts.empty =
        counts.all.recipes === 0 &&
        counts.all.ingredients === 0 &&
        counts.all.types === 0;

      this.dataStore.setState({
        localCounts: {
          ...counts,
          loading: false,
          error: null,
          available: true,
        },
      });
    } catch (error) {
      console.error('Failed to get local counts:', error);
      this.dataStore.setState({
        localCounts: {
          ...this.dataStore._state.localCounts,
          loading: false,
          error: {
            title: 'Données indisponibles',
            message: 'Impossible de récupérer les données locales.',
          },
        },
      });
    }
  }

  async refreshRemoteCounts() {
    try {
      if (this.connectionStore.online !== true) {
        throw new ConnectionError('Offline', 'offline');
      }
      if (this.connectionStore.available !== true) {
        throw new ConnectionError('API Unavailable', 'apiUnavailable');
      }
      this.dataStore.setState({
        remoteCounts: {
          ...this.dataStore._state.remoteCounts,
          loading: true,
          error: null,
        },
      });
      const counts = structuredClone(countsModel);
      counts.all = await this.apiService.operations.global.getRemoteCounts();

      const dirtyVersionsEndpoints =
        await this.apiService.operations.global.getDirtyEntitiesVersions();

      // Filter and count dirty versions, excluding already synced entities
      const filteredDirtyVersions = [];

      for (const endpoint of config.ENDPOINTS_SYNCABLE) {
        const versions = dirtyVersionsEndpoints[endpoint] ?? [];
        counts.deleted[endpoint] = 0;
        counts.created[endpoint] = 0;
        counts.modified[endpoint] = 0;

        for (const version of versions) {
          // Add endpoint to version object
          const versionWithEndpoint = { ...version, endpoint };

          // Check if already synced
          const repository = this.repositories.get(endpoint);
          const isSynced = repository
            ? await repository.isSynced(version.uuid, version.dateReceived)
            : false;

          if (!isSynced) {
            // Count only non-synced entities
            if (version.dateDeleted) {
              counts.deleted[endpoint]++;
            } else {
              const existsLocally = repository
                ? Boolean(await repository.table.get(version.uuid))
                : false;
              if (!existsLocally) {
                counts.created[endpoint]++;
              } else {
                counts.modified[endpoint]++;
              }
            }
            // Keep in filtered list
            filteredDirtyVersions.push(versionWithEndpoint);
          }
        }
      }

      // Store filtered dirty versions in DataStore for quick lookup
      const dirtyVersionsMap = new Map();
      filteredDirtyVersions.forEach((version) => {
        dirtyVersionsMap.set(version.uuid, version);
      });

      let changes = 0;
      for (const endpoint of config.ENDPOINTS_SYNCABLE) {
        changes += counts.created[endpoint];
        changes += counts.modified[endpoint];
        changes += counts.deleted[endpoint];
      }
      counts.hasChanges = changes > 0;

      counts.empty =
        counts.all.recipes === 0 &&
        counts.all.ingredients === 0 &&
        counts.all.types === 0;

      this.dataStore.setState({
        remoteCounts: {
          ...counts,
          loading: false,
          error: null,
          available: true,
          lastCheck: new Date(),
        },
        remoteDirtyVersions: dirtyVersionsMap,
      });
    } catch (error) {
      const reason =
        error instanceof ConnectionError ? error.reason : 'unknown';
      console.error('Failed to get remote counts:', error);
      this.dataStore.setState({
        remoteCounts: {
          ...this.dataStore.state.remoteCounts,
          loading: false,
          error: {
            title:
              reason === 'offline'
                ? 'Hors ligne'
                : reason === 'apiUnavailable'
                  ? 'Serveur indisponible'
                  : 'Erreur serveur',
            message: 'Impossible de récupérer les données distantes.',
          },
        },
      });
    }
  }
}
