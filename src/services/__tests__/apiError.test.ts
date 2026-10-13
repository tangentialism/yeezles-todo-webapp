import { describe, it, expect } from 'vitest';
import { ApiError, isApiError, retryMutationUnlessClientError, retryUnlessClientError, toApiError } from '../apiError';

/** Shape axios's isAxiosError() recognizes, without a real request. */
const axiosError = (status?: number, data?: unknown) =>
  Object.assign(new Error('Request failed'), {
    isAxiosError: true,
    response: status === undefined ? undefined : { status, data },
  });

describe('toApiError', () => {
  it('reads code, message and errors[] from the error envelope', () => {
    const err = toApiError(
      axiosError(422, {
        success: false,
        error: {
          code: 'PROPOSAL_INVALID',
          message: '2 item(s) cannot be applied; nothing was applied',
          errors: [
            { path: 'assignments[3].todo_id', reason: 'todo not found' },
            { path: '', reason: 'whole payload' },
            { nonsense: true },
          ],
        },
      })
    );
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(422);
    expect(err.code).toBe('PROPOSAL_INVALID');
    expect(err.message).toBe('2 item(s) cannot be applied; nothing was applied');
    expect(err.errors).toEqual([
      { path: 'assignments[3].todo_id', reason: 'todo not found' },
      { path: '', reason: 'whole payload' },
    ]);
  });

  it('falls back to HTTP_<status> and a top-level message when the envelope has no code', () => {
    const err = toApiError(axiosError(500, { success: false, message: 'Something broke' }));
    expect(err.code).toBe('HTTP_500');
    expect(err.message).toBe('Something broke');
    expect(err.errors).toEqual([]);
  });

  it('tolerates a string error field (auth failures send one)', () => {
    const err = toApiError(axiosError(401, { success: false, error: 'User not authenticated' }));
    expect(err.status).toBe(401);
    expect(err.code).toBe('HTTP_401');
    expect(err.message).toBe('User not authenticated');
  });

  it('marks a request with no response as a network error', () => {
    const err = toApiError(axiosError(undefined));
    expect(err.status).toBe(0);
    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.message).toBe('Could not reach the server. Check your connection and try again.');
  });

  it('wraps anything else as UNKNOWN and passes an ApiError through unchanged', () => {
    expect(toApiError(new Error('boom'))).toMatchObject({ status: 0, code: 'UNKNOWN', message: 'boom' });
    expect(toApiError('weird')).toMatchObject({ code: 'UNKNOWN', message: 'Unexpected error' });
    const original = new ApiError(409, 'TOPIC_NAME_TAKEN', 'taken');
    expect(toApiError(original)).toBe(original);
  });
});

describe('isApiError', () => {
  it('matches the class and, when given, the code', () => {
    const err = new ApiError(409, 'AREA_HAS_TOPICS', 'has topics');
    expect(isApiError(err)).toBe(true);
    expect(isApiError(err, 'AREA_HAS_TOPICS')).toBe(true);
    expect(isApiError(err, 'TOPIC_NAME_TAKEN')).toBe(false);
    expect(isApiError(new Error('x'))).toBe(false);
  });
});

describe('retryUnlessClientError', () => {
  it('never retries a 4xx and retries other failures up to three times', () => {
    expect(retryUnlessClientError(0, new ApiError(404, 'TOPIC_NOT_FOUND', 'gone'))).toBe(false);
    expect(retryUnlessClientError(0, new ApiError(500, 'HTTP_500', 'x'))).toBe(true);
    expect(retryUnlessClientError(2, new ApiError(0, 'NETWORK_ERROR', 'x'))).toBe(true);
    expect(retryUnlessClientError(3, new ApiError(0, 'NETWORK_ERROR', 'x'))).toBe(false);
  });
});

// B3: the app-wide mutation retry. A refusal (4xx) will not change on retry,
// and retrying it sent a second DELETE and delayed the error toast.
describe('retryMutationUnlessClientError', () => {
  it('never retries a 4xx ApiError', () => {
    expect(retryMutationUnlessClientError(0, new ApiError(400, 'BUSINESS_RULE_VIOLATION', 'x'))).toBe(false);
    expect(retryMutationUnlessClientError(0, new ApiError(409, 'AREA_HAS_TOPICS', 'x'))).toBe(false);
    expect(retryMutationUnlessClientError(0, new ApiError(499, 'HTTP_499', 'x'))).toBe(false);
  });

  it('retries a network error, a 5xx or a non-ApiError once', () => {
    for (const error of [new ApiError(0, 'NETWORK_ERROR', 'x'), new ApiError(500, 'HTTP_500', 'x'), new Error('x')]) {
      expect(retryMutationUnlessClientError(0, error)).toBe(true);
      expect(retryMutationUnlessClientError(1, error)).toBe(false);
    }
  });
});
