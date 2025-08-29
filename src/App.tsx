import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { AreaProvider } from './contexts/AreaContext';
import LoginButton from './components/LoginButton';
import Dashboard from './components/Dashboard';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, isGoogleReady } = useAuth();

  console.log('🔧 AppContent render state:', { isAuthenticated, isLoading, isGoogleReady });

  if (isLoading) {
    console.log('📱 Rendering: Loading screen');
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    console.log('📱 Rendering: Dashboard (authenticated)');
    return (
      <AreaProvider>
        <Dashboard />
      </AreaProvider>
    );
  } else {
    console.log('📱 Rendering: LoginButton (not authenticated)');
    return <LoginButton />;
  }
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;