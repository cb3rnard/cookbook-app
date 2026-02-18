import { config } from '@src/config/config';

// Shared types and interfaces
export interface EndpointCounts {
  recipes: number;
  ingredients: number;
  types: number;
}

export const defaultEndpointCounts: EndpointCounts = {
  [config.ENDPOINTS_CONSTANTS.RECIPES]: 0,
  [config.ENDPOINTS_CONSTANTS.INGREDIENTS]: 0,
  [config.ENDPOINTS_CONSTANTS.TYPES]: 0,
};

export interface ErrorInfo {
  title: string;
  message: string;
}

export interface CountsModel {
  all: EndpointCounts;
  deleted: EndpointCounts;
  created: EndpointCounts;
  modified: EndpointCounts;
  empty: boolean;
  hasChanges: boolean;
  loading: boolean;
  error: ErrorInfo | null;
  available: boolean;
  lastCheck: Date | null;
}

export const countsModel: CountsModel = {
  all: { ...defaultEndpointCounts },
  deleted: { ...defaultEndpointCounts },
  created: { ...defaultEndpointCounts },
  modified: { ...defaultEndpointCounts },
  empty: true,
  hasChanges: false,
  loading: false,
  error: null,
  available: true,
  lastCheck: null,
};
