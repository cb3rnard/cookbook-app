import { Endpoint, EndpointSyncable } from '@src/config/config';
import { Recipe } from '@src/models/entities/Recipe.ts';
import {
  Entity,
  EntityData,
  EntitySyncable,
  ImageData,
} from '@src/types/entities.ts';
import { SyncOperationState } from '@src/types/sync.ts';
import { DebugService } from '../DebugService';

// Event payload types
export interface EventPayloads {
  'app:clear': undefined;
  'sync:started': {};
  'sync:import': {};
  'sync:export': {};
  'sync:completed': SyncOperationState;
  'sync:error': { error: Error };
  'sync:imported': { endpoint: Endpoint; entity: EntitySyncable };
  'sync:request:entity': {
    endpoint: EndpointSyncable;
    uuid: string;
    isDirty: boolean;
    remoteOnly: boolean;
    callback: (data: any) => void;
  };
  'sync:request:imageBinary': { uuid: string; callback: (data: any) => void };
  'entity:saved': { endpoint: Endpoint; entity: Entity };
  'entity:updated': {
    endpoint: Endpoint;
    entityData: Partial<EntityData> & { uuid: string };
    entity?: Entity;
  };
  'entity:deleted': { endpoint: Endpoint; uuid: string };
  'entity:synced': {
    endpoint: Endpoint;
    uuid: string;
    lastSyncDate: string;
  };
  'entities:cleared': { entityType: string | null };
  deleted: { entityType?: string | null };
  'recipe:savedWithRelations': { recipe: Recipe; isNew: boolean };
  'recipe:updatedWithRelations': { recipe: Recipe };
  'image:synced': { image: ImageData };
  'config:deleted': { key: string };
  'config:updated': { key: string; value: any };
  'config:reset': {};
  'config:bulkUpdate': { [key: string]: any };
}

type EventName = keyof EventPayloads;
type EventCallback<T extends EventName> = (payload: EventPayloads[T]) => void;

/**
 * EventBus simple pour découpler les services
 */
export class EventBus {
  private listeners: { [K in EventName]?: EventCallback<K>[] } = {};
  private static instance: EventBus | null = null;

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  constructor() {
    this.listeners = {};
  }

  on<T extends EventName>(event: T, callback: EventCallback<T>): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    (this.listeners[event] as EventCallback<T>[]).push(callback);
  }

  off<T extends EventName>(event: T, callback: EventCallback<T>): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = (
      this.listeners[event] as EventCallback<T>[]
    ).filter((cb) => cb !== callback) as any;
  }

  emit<T extends EventName>(
    event: T,
    data: EventPayloads[T] = {} as EventPayloads[T],
  ): void {
    DebugService.log('', `EventBus emit: ${event}`, data);
    if (!this.listeners[event]) return;
    (this.listeners[event] as EventCallback<T>[]).forEach((callback) =>
      callback(data),
    );
  }
}
