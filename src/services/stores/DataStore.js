import { BaseStore } from "./BaseStore.js";

const countsModel = {
  all: { recipes: 0, ingredients: 0, types: 0 },
  deleted: { recipes: 0, ingredients: 0, types: 0 },
  modified: { recipes: 0, ingredients: 0, types: 0 },
  hasChanges: false,
  loading: false,
  error: null,
  available: true,
};
const initialState = {
  localCounts: countsModel,
  remoteCounts: countsModel,
};

export class DataStore extends BaseStore {
  constructor() {
    super(initialState);
  }
}
