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
import OAuthConsentPage from './components/OAuthConsentPage';
import ProposalReview from './components/proposals/ProposalReview';
import { QUERY_STALE_TIME_MS, MAX_QUERY_RETRIES } from './constants';
import { retryMutationUnlessClientError } from './services/apiError';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME_MS,
      retry: (failureCount, error: unknown) => {
        // Don't retry on 401/403 errors
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 401 || status === 403) {
          return false;
        }
        return failureCount < MAX_QUERY_RETRIES;
      },
    },
    mutations: {
      // A 4xx refusal is final; network errors and 5xx retry once
      retry: retryMutationUnlessClientError,
    },
  },
});

/**
 * Route table. Exported for routing tests, which render it inside a
 * MemoryRouter with a mocked useAuth.
 */
export const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-paper">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-ink-muted">Checking authentication...</p>
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
      {/*
        OAuth consent (spec §6.2). Signed out, LoginButton renders at THIS
        URL, so ?request=<id> survives sign-in without a return-to parameter:
        Google sign-in flips auth state in place and passkey sign-in reloads
        the current URL. No AreaProvider -- the page never touches areas.
      */}
      <Route path="/oauth/consent" element={
        isAuthenticated ? <OAuthConsentPage /> : <LoginButton />
      } />
      {/*
        Proposal review (topics spec §5.4, §7.4). The MCP review_url lands
        here. Signed out, LoginButton renders at this URL, so the id survives
        sign-in, as on /oauth/consent.
      */}
      <Route path="/topics/proposals/:id" element={
        isAuthenticated ? (
          <AreaProvider>
            <ProposalReview />
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