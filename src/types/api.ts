import { EndpointSyncable } from '@src/config/config';
import { ApiPlatformError } from '@src/services/api/ApiPlatformError';
import { EntityApi } from './entities';

export interface ApiViolation {
  property: string;
  message: string;
  code?: string;
}

export type ApiRequestBody = Record<string, unknown> | FormData;

export interface ApiFetchOptions {
  method?: string;
  credentials?: RequestCredentials;
  headers?: Record<string, string>;
  body?: ApiRequestBody | EntityApi | EntityApi[];
  queryParams?: Record<string, string>;
  _isRetry?: boolean;
}

export interface JSONResponse {
  ok: boolean;
  status: number;
  type: string;
  trace?: Record<string, unknown>;
  title: string;
  detail: string;
  description: string;
  statusText: string;
  violations: ApiViolation[];
  '@type': string;
  '@context': string;
  '@id': string;
}

export interface ApiErrorSummary {
  message: string;
  status: number;
  category: typeof ApiPlatformError.prototype.category;
  context: string;
  detail: string;
  isRetryable: boolean;
}

export interface ApiErrorHandledResult {
  originalError: Error;
  strategy: {
    userMessage: string;
    shouldLogout: boolean;
    shouldRetry: boolean;
    severity: 'error' | 'warning' | 'info' | 'debug' | 'silent';
  };
  technicalDetails: ApiErrorSummary;
  category: typeof ApiPlatformError.prototype.category;
  userMessage: string;
  context: Record<string, unknown>;
  timestamp: string;
  isApiPlatformError: boolean;
  actions: {
    shouldLogout: boolean;
    shouldRetry: boolean;
    shouldShowToUser: boolean;
    shouldReport: boolean;
  };
}

export interface RemoteDirtyVersion {
  uuid: string;
  version: number;
  dateReceived: string;
  dateDeleted: string;
  endpoint: EndpointSyncable;
}

export type RemoteDirtyEntityVersions = Record<
  EndpointSyncable,
  RemoteDirtyVersion[]
>;

// Backward compatibility aliases (deprecated)
export type remoteDirtyVersion = RemoteDirtyVersion;
export type remoteDirtyEntityVersions = RemoteDirtyEntityVersions;
