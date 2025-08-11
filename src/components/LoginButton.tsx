import React, { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

const LoginButton: React.FC = () => {
  const { login } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.google && buttonRef.current) {
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: '280px',
      });
    }
  }, []);

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
          <div ref={buttonRef}></div>
        </div>
        
        <div className="mt-6 text-xs text-gray-500 text-center">
          <p>Secure authentication with Google OAuth 2.0</p>
        </div>
      </div>
    </div>
  );
};

export default LoginButton;
