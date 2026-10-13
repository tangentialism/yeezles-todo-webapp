import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PasskeyLoginButton from './PasskeyLoginButton';
import Switch from './ui/Switch';
import { Spinner } from './ui/Icons';
import { logger } from '../utils/logger';
import type { GoogleCredentialResponse } from '../types/auth';

/**
 * Full-page sign-in: passkey first, then Google's own button, then a
 * "Stay signed in" switch.
 *
 * When the switch is on, the login flow creates a persistent server-side
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

        // Google draws this button itself; shape and width are all we set.
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          logo_alignment: 'center',
          width: '316px',
        });
      } catch (error) {
        logger.error('Failed to render Google sign-in button:', error);
      }
    }
  }, [isGoogleReady, rememberMe]); // Re-run when Google becomes ready or remember me changes

  return (
    <div className="min-h-screen bg-paper flex flex-col px-6 sm:items-center sm:pt-[18vh]">
      <div className="w-full sm:max-w-[380px] flex flex-col flex-1 sm:flex-none">
        <div className="flex-1 sm:flex-none flex flex-col justify-center sm:text-center">
          <h1 className="font-serif font-medium text-4xl sm:text-[40px] leading-[1.1] tracking-[-0.015em] text-ink">
            Yeezles
          </h1>
          <p className="mt-2 sm:mt-2.5 text-sm text-ink-muted">Sign in to continue</p>
        </div>

        <div className="sm:mt-8 sm:p-7 flex flex-col gap-4 sm:gap-[18px] pb-10 sm:pb-7 sm:bg-surface sm:rounded-[18px] sm:shadow-[0_1px_2px_rgb(20_26_33_/_0.04),0_0_0_1px_rgb(20_26_33_/_0.06)]">
          <PasskeyLoginButton onSuccess={() => window.location.reload()} />

          <div
            aria-hidden="true"
            className="flex items-center gap-3 font-mono text-[11.5px] uppercase tracking-[0.12em] text-ink-faint before:flex-1 before:h-px before:bg-line after:flex-1 after:h-px after:bg-line"
          >
            or
          </div>

          <div className="flex justify-center min-h-[44px]">
            {isGoogleReady && !isLoading ? (
              <div ref={buttonRef}></div>
            ) : (
              <div className="w-full flex items-center justify-center gap-2.5 h-11 rounded-full border border-line-strong bg-surface text-sm text-ink-muted">
                <Spinner className="w-4 h-4" />
                {isLoading ? 'Signing in…' : 'Loading Google sign-in…'}
              </div>
            )}
          </div>

          {isGoogleReady && !isLoading && (
            <label
              htmlFor="remember-me"
              className="flex items-center gap-3 min-h-[44px] pt-3 sm:pt-4 border-t border-line cursor-pointer"
            >
              <span className="flex-1 text-sm text-ink">
                Stay signed in <span className="font-mono text-[12.5px] text-ink-faint">90 days</span>
              </span>
              <Switch id="remember-me" checked={rememberMe} onChange={setRememberMe} />
            </label>
          )}

          <p className="sm:hidden text-[12.5px] text-ink-faint">Authorized accounts only</p>
        </div>

        <p className="hidden sm:block mt-[18px] text-center text-[12.5px] text-ink-faint">Authorized accounts only</p>
      </div>
    </div>
  );
};

export default LoginButton;
