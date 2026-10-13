import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PasskeyLoginButton from './PasskeyLoginButton';
import { logger } from '../utils/logger';
import type { GoogleCredentialResponse } from '../types/auth';

/**
 * Full-page login screen with a Google Sign-In button and "Remember me" checkbox.
 *
 * When "Remember me" is checked, the login flow creates a persistent server-side
 * session (90-day cookie) in addition to the standard Google OAuth token.
 * Re-initializes the Google button whenever `rememberMe` toggles so the
 * credential callback captures the latest value.
 */
const LoginButton: React.FC = () => {
  const { isGoogleReady, login } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Custom login handler that includes remember me option
  const handleGoogleLogin = async (credentialResponse: GoogleCredentialResponse) => {
    setIsLoading(true);
    try {
      await login(credentialResponse, rememberMe);
    } catch (error) {
      logger.error('Login failed:', error);
      // Error handling is done in the AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only render the button when Google is ready and we have a button container
    if (isGoogleReady && window.google && buttonRef.current) {
      try {
        // Initialize with custom callback
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleLogin, // Use our custom handler
          auto_select: false,
          cancel_on_tap_outside: false,
        });

        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: '280px',
        });
      } catch (error) {
        logger.error('Failed to render Google sign-in button:', error);
      }
    }
  }, [isGoogleReady, rememberMe]); // Re-run when Google becomes ready or remember me changes

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-paper">
      <div className="bg-surface p-8 rounded-[18px] shadow-dialog max-w-md w-full mx-4">
        <div className="text-center mb-7">
          <h1 className="font-serif font-medium text-4xl tracking-[-0.015em] text-ink mb-2">Yeezles</h1>
          <p className="text-sm text-ink-muted">
            Sign in with your authorized Google account
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            Access restricted to authorized users only
          </p>
        </div>
        
        <div className="mb-4">
          <PasskeyLoginButton onSuccess={() => window.location.reload()} />
        </div>
        <div className="text-center text-xs text-ink-faint mb-4">or</div>

        <div className="flex justify-center">
          {isGoogleReady && !isLoading ? (
            <div ref={buttonRef}></div>
          ) : (
            <div className="flex items-center justify-center py-3 px-6 border border-line-strong rounded-[10px]">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-ink mr-3"></div>
              <span className="text-ink-muted">
                {isLoading ? 'Signing In...' : 'Loading Sign In...'}
              </span>
            </div>
          )}
        </div>
        
        {/* Remember Me Checkbox */}
        {isGoogleReady && !isLoading && (
          <div className="mt-4 flex items-center justify-center">
            <label className="flex items-center space-x-2 text-sm text-ink-muted cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-line-strong text-accent shadow-sm focus:border-accent focus:ring focus:ring-accent/20 focus:ring-opacity-50"
              />
              <span>Remember me for 90 days</span>
            </label>
          </div>
        )}
        
        <div className="mt-6 text-xs text-ink-muted text-center">
          <p>Secure authentication with Google OAuth 2.0</p>
          {rememberMe && (
            <p className="mt-1 text-accent">
              Persistent session will be created for secure access
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginButton;
