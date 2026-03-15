/**
 * Authentication types for Google OAuth and the Google Identity Services SDK.
 */

/** Authenticated user profile extracted from the Google ID token JWT. */
export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

/** Snapshot of the current authentication state managed by {@link AuthContext}. */
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Payload returned by Google's `credential` callback after the user signs in.
 */
export interface GoogleCredentialResponse {
  /** JWT ID token containing user identity claims. */
  credential: string;
  /** How the credential was obtained (e.g. "btn", "auto", "user"). */
  select_by: string;
}

// Extend window object for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfiguration) => void;
          renderButton: (element: HTMLElement, config: GoogleButtonConfiguration) => void;
          prompt: () => void;
          disableAutoSelect: () => void;
          revoke: (email: string, callback: () => void) => void;
        };
      };
    };
  }
}

/** Configuration passed to `google.accounts.id.initialize()`. */
export interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}

/** Configuration for rendering the Google Sign-In button. */
export interface GoogleButtonConfiguration {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: string;
}
