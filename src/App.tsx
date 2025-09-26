import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { AreaProvider } from './contexts/AreaContext';
import LoginButton from './components/LoginButton';
import Dashboard from './components/Dashboard';
import CreateTodoFromExternal from './components/CreateTodoFromExternal';
import CreateMultipleTodos from './components/CreateMultipleTodos';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 401/403 errors
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: 1,
    },
  },
});

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/create-todo-from-external" element={
        isAuthenticated ? (
          <AreaProvider>
            <CreateTodoFromExternal />
          </AreaProvider>
        ) : (
          <LoginButton />
        )
      } />
      <Route path="/create-multiple-todos" element={
        isAuthenticated ? (
          <AreaProvider>
            <CreateMultipleTodos />
          </AreaProvider>
        ) : (
          <LoginButton />
        )
      } />
      <Route path="/*" element={
        isAuthenticated ? (
          <AreaProvider>
            <Dashboard />
          </AreaProvider>
        ) : (
          <LoginButton />
        )
      } />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ToastProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </BrowserRouter>
  );
};

export default App;