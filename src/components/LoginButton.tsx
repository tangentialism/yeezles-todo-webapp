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
          <p className="text-gray-600">
            Sign in with your Google account to access your todos
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
