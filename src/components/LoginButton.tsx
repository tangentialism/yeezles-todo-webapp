import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const LoginButton: React.FC = () => {
  const { isGoogleReady, login } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Custom login handler that includes remember me option
  const handleGoogleLogin = async (credentialResponse: any) => {
    setIsLoading(true);
    try {
      await login(credentialResponse, rememberMe);
    } catch (error) {
      console.error('Login failed:', error);
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
        console.error('❌ Failed to render Google sign-in button:', error);
      }
    }
  }, [isGoogleReady, rememberMe]); // Re-run when Google becomes ready or remember me changes

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Yeezles Todo</h1>
          <p className="text-gray-600 mb-2">
            Sign in with your authorized Google account
          </p>
          <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-md">
            🔒 Access restricted to authorized users only
          </p>
        </div>
        
        <div className="flex justify-center">
          {isGoogleReady && !isLoading ? (
            <div ref={buttonRef}></div>
          ) : (
            <div className="flex items-center justify-center py-3 px-6 border border-gray-300 rounded-md">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600 mr-3"></div>
              <span className="text-gray-600">
                {isLoading ? 'Signing In...' : 'Loading Sign In...'}
              </span>
            </div>
          )}
        </div>
        
        {/* Remember Me Checkbox */}
        {isGoogleReady && !isLoading && (
          <div className="mt-4 flex items-center justify-center">
            <label className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
              <span>Remember me for 90 days</span>
            </label>
          </div>
        )}
        
        <div className="mt-6 text-xs text-gray-500 text-center">
          <p>Secure authentication with Google OAuth 2.0</p>
          {rememberMe && (
            <p className="mt-1 text-indigo-600">
              🔒 Persistent session will be created for secure access
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginButton;
