import React, { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

const LoginButton: React.FC = () => {
  const { isGoogleReady } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only render the button when Google is ready and we have a button container
    if (isGoogleReady && window.google && buttonRef.current) {
      try {
        console.log('🔧 Rendering Google sign-in button');
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: '280px',
        });
        console.log('✅ Google sign-in button rendered successfully');
      } catch (error) {
        console.error('❌ Failed to render Google sign-in button:', error);
      }
    } else if (isGoogleReady && !window.google) {
      console.error('❌ Google OAuth marked as ready but window.google is missing');
    }
  }, [isGoogleReady]); // Re-run when Google becomes ready

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
          {isGoogleReady ? (
            <>
              <div ref={buttonRef}></div>
              {/* Fallback if Google button fails to render */}
              {isGoogleReady && !window.google && (
                <div className="text-center py-4">
                  <div className="text-red-600 mb-2">❌ Google OAuth failed to load</div>
                  <div className="text-sm text-gray-600">
                    Please check your internet connection and refresh the page.
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center py-3 px-6 border border-gray-300 rounded-md">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600 mr-3"></div>
              <span className="text-gray-600">Loading Sign In...</span>
            </div>
          )}
        </div>
        
        <div className="mt-6 text-xs text-gray-500 text-center">
          <p>Secure authentication with Google OAuth 2.0</p>
        </div>
      </div>
    </div>
  );
};

export default LoginButton;
