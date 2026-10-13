/**
 * One error type for the topic and proposal endpoints, so callers can branch
 * on status and code (spec §8: network failure vs 422 vs 409) instead of
 * parsing axios internals.
 */
import { isAxiosError } from 'axios';
import { MAX_MUTATION_RETRIES, MAX_QUERY_RETRIES } from '../constants';

/** One per-item problem from a 400 or 422; `path` indexes into the submitted payload. */
export interface ApiFieldError {
  path: string;
  reason: string;
}

/** A failed API call: HTTP status (0 when no response), backend code, message and item errors. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly errors: ApiFieldError[];

  constructor(status: number, code: string, message: string, errors: ApiFieldError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

const isFieldError = (value: unknown): value is ApiFieldError =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as ApiFieldError).path === 'string' &&
  typeof (value as ApiFieldError).reason === 'string';

/**
 * Converts anything thrown by an axios call into an {@link ApiError}.
 * Reads `{ success: false, error: { code, message, errors? } }`, tolerating
 * the older `{ message }` and `{ error: 'text' }` shapes.
 */
export const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error;
  if (isAxiosError(error)) {
    const response = error.response;
    if (!response) {
      return new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection and try again.');
    }
    const body: Record<string, unknown> =
      typeof response.data === 'object' && response.data !== null ? (response.data as Record<string, unknown>) : {};
    const envelope =
      typeof body.error === 'object' && body.error !== null ? (body.error as Record<string, unknown>) : {};
    const code = typeof envelope.code === 'string' ? envelope.code : `HTTP_${response.status}`;
    const message =
      typeof envelope.message === 'string'
        ? envelope.message
        : typeof body.error === 'string'
          ? body.error
          : typeof body.message === 'string'
            ? body.message
            : `Request failed (${response.status})`;
    const errors = Array.isArray(envelope.errors) ? envelope.errors.filter(isFieldError) : [];
    return new ApiError(response.status, code, message, errors);
  }
  return new ApiError(0, 'UNKNOWN', error instanceof Error ? error.message : 'Unexpected error');
};

/** True for an {@link ApiError}, optionally with a specific backend code. */
export const isApiError = (error: unknown, code?: string): error is ApiError =>
  error instanceof ApiError && (code === undefined || error.code === code);

const isClientError = (error: unknown): boolean =>
  error instanceof ApiError && error.status >= 400 && error.status < 500;

/** react-query `retry`: a 4xx will not change on retry; anything else retries like the app default. */
export const retryUnlessClientError = (failureCount: number, error: unknown): boolean => {
  if (isClientError(error)) return false;
  return failureCount < MAX_QUERY_RETRIES;
};

/**
 * The app-wide mutation `retry`: a 4xx refusal is final (retrying it repeats
 * the request and delays the error toast); a network error, a 5xx or any
 * other failure retries up to `MAX_MUTATION_RETRIES` times.
 */
export const retryMutationUnlessClientError = (failureCount: number, error: unknown): boolean => {
  if (isClientError(error)) return false;
  return failureCount < MAX_MUTATION_RETRIES;
};
