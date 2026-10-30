import { ApiError } from '../services/apiError';

/**
 * Plain-sentence copy for the Peopler errors the backend can answer. Takes the
 * thrown value as is: 502 and 503 `PEOPLER_UNAVAILABLE` read differently
 * (unreachable vs not configured), and a network failure keeps its own message.
 */
export const peoplerErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'PEOPLER_TOKEN_REJECTED':
        return "Peopler didn't accept that token. Copy it again from Peopler → Settings → API token.";
      case 'PEOPLER_UNAVAILABLE':
        return error.status === 503 ? "Peopler isn't set up on this server." : "Couldn't reach Peopler. Try again in a minute.";
      case 'PEOPLER_PERSON_NOT_FOUND':
        return "That person isn't in your Peopler any more. Search again.";
      case 'PEOPLER_NAME_MISMATCH':
        return 'That Peopler person has a different name. Pick someone else, or rename this person first.';
      case 'PEOPLER_ID_TAKEN':
        return 'Someone else here is already linked to that Peopler person.';
      case 'PEOPLER_NOT_CONNECTED':
        return 'Connect Peopler from the account menu first.';
      case 'NETWORK_ERROR':
        return error.message;
    }
  }
  return 'Something went wrong. Try again.';
};
