import { describe, it, expect } from 'vitest';
import { ApiError } from '../../services/apiError';
import { peoplerErrorMessage } from '../peoplerErrors';

const err = (status: number, code: string, message = 'server words') => new ApiError(status, code, message);

describe('peoplerErrorMessage', () => {
  it.each([
    [err(422, 'PEOPLER_TOKEN_REJECTED'), "Peopler didn't accept that token. Copy it again from Peopler → Settings → API token."],
    [err(502, 'PEOPLER_UNAVAILABLE'), "Couldn't reach Peopler. Try again in a minute."],
    [err(503, 'PEOPLER_UNAVAILABLE'), "Peopler isn't set up on this server."],
    [err(422, 'PEOPLER_PERSON_NOT_FOUND'), "That person isn't in your Peopler any more. Search again."],
    [err(422, 'PEOPLER_NAME_MISMATCH'), 'That Peopler person has a different name. Pick someone else, or rename this person first.'],
    [err(409, 'PEOPLER_ID_TAKEN'), 'Someone else here is already linked to that Peopler person.'],
    [err(400, 'PEOPLER_NOT_CONNECTED'), 'Connect Peopler from the account menu first.'],
    [err(500, 'SOMETHING_ELSE'), 'Something went wrong. Try again.'],
  ])('maps %o', (error, expected) => {
    expect(peoplerErrorMessage(error)).toBe(expected);
  });

  it('tells 502 from 503 PEOPLER_UNAVAILABLE', () => {
    expect(peoplerErrorMessage(err(502, 'PEOPLER_UNAVAILABLE'))).not.toBe(peoplerErrorMessage(err(503, 'PEOPLER_UNAVAILABLE')));
  });

  it('passes a NETWORK_ERROR message through', () => {
    expect(peoplerErrorMessage(new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server.'))).toBe('Could not reach the server.');
  });

  it('falls back for anything that is not an ApiError', () => {
    expect(peoplerErrorMessage(new Error('boom'))).toBe('Something went wrong. Try again.');
    expect(peoplerErrorMessage('x')).toBe('Something went wrong. Try again.');
    expect(peoplerErrorMessage(undefined)).toBe('Something went wrong. Try again.');
  });
});
