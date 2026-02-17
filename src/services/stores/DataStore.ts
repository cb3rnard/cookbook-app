import { DataState, defaultDataState } from '@src/types/states.js';
import { BaseStore } from './BaseStore.js';

export class DataStore extends BaseStore<DataState> {
  constructor() {
    super({ ...defaultDataState });
  }
}
