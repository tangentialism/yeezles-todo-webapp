import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, AuthContext } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import { AreaProvider } from '../contexts/AreaContext';
import type { User } from '../contexts/AuthContext';
import type { Area } from '../types/area';
import type { Todo } from '../types/todo';

/**
 * Custom render options for testing
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Initial auth state
  initialUser?: User | null;
  initialAuthState?: {
    isAuthenticated?: boolean;
    isLoading?: boolean;
    isGoogleReady?: boolean;
  };
  
  // Initial area state  
  initialAreas?: Area[];
  initialCurrentArea?: Area | null;
  
  // Whether to include providers
  includeAuth?: boolean;
  includeToast?: boolean;
  includeArea?: boolean;
  includeQueryClient?: boolean;
  
  // Custom query client
  queryClient?: QueryClient;
}

/**
 * Creates a fresh QueryClient for each test to avoid state pollution
 */
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Mock AuthContext Provider for testing
 */
const MockAuthProvider: React.FC<{
  children: React.ReactNode;
  initialUser?: User | null;
  initialAuthState?: any;
}> = ({ children, initialUser = null, initialAuthState = {} }) => {
  const mockAuthValue = {
    user: initialUser,
    idToken: initialUser ? 'mock-token' : null,
    tokenExpiry: initialUser ? Date.now() + 3600000 : null, // 1 hour from now
    isAuthenticated: initialUser !== null,
    isLoading: false,
    isGoogleReady: true,
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn(),
    getValidToken: vi.fn().mockReturnValue(initialUser ? 'mock-token' : null),
    refreshTokenIfNeeded: vi.fn().mockResolvedValue(undefined),
    ...initialAuthState,
  };

  return (
    <AuthContext.Provider value={mockAuthValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * All Providers Wrapper - includes all context providers
 */
const AllProvidersWrapper: React.FC<{
  children: React.ReactNode;
  options: CustomRenderOptions;
}> = ({ children, options }) => {
  const {
    initialUser,
    initialAuthState,
    initialAreas,
    initialCurrentArea,
    includeAuth = true,
    includeToast = true,
    includeArea = true,
    includeQueryClient = true,
    queryClient = createTestQueryClient(),
  } = options;

  let wrappedChildren = children;

  // Wrap with QueryClient if needed
  if (includeQueryClient) {
    wrappedChildren = (
      <QueryClientProvider client={queryClient}>
        {wrappedChildren}
      </QueryClientProvider>
    );
  }

  // Wrap with ToastProvider if needed
  if (includeToast) {
    wrappedChildren = (
      <ToastProvider>
        {wrappedChildren}
      </ToastProvider>
    );
  }

  // Wrap with AuthProvider if needed
  if (includeAuth) {
    wrappedChildren = (
      <MockAuthProvider 
        initialUser={initialUser}
        initialAuthState={initialAuthState}
      >
        {wrappedChildren}
      </MockAuthProvider>
    );
  }

  // Wrap with AreaProvider if needed (requires Auth and Toast)
  if (includeArea && includeAuth && includeToast) {
    wrappedChildren = (
      <AreaProvider>
        {wrappedChildren}
      </AreaProvider>
    );
  }

  return <>{wrappedChildren}</>;
};

/**
 * Custom render function with all providers
 */
export const renderWithProviders = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllProvidersWrapper options={options}>
      {children}
    </AllProvidersWrapper>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    // Return the query client for additional test utilities
    queryClient: options.queryClient || createTestQueryClient(),
  };
};

/**
 * Render with minimal providers (just QueryClient)
 */
export const renderWithQueryClient = (
  ui: React.ReactElement,
  options: RenderOptions & { queryClient?: QueryClient } = {}
) => {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
};

/**
 * Render with auth context only
 */
export const renderWithAuth = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  return renderWithProviders(ui, {
    ...options,
    includeAuth: true,
    includeToast: false,
    includeArea: false,
    includeQueryClient: true,
  });
};

/**
 * Render authenticated component (user logged in)
 */
export const renderAuthenticated = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { initialUser, ...restOptions } = options;
  
  return renderWithProviders(ui, {
    initialUser: initialUser || {
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
    },
    initialAuthState: {
      isAuthenticated: true,
      isLoading: false,
      isGoogleReady: true,
    },
    ...restOptions,
  });
};

/**
 * Render unauthenticated component (user not logged in)
 */
export const renderUnauthenticated = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  return renderWithProviders(ui, {
    initialUser: null,
    initialAuthState: {
      isAuthenticated: false,
      isLoading: false,
      isGoogleReady: true,
    },
    ...options,
  });
};

/**
 * Wait for queries to settle (useful for async components)
 */
export const waitForQueryToSettle = async (queryClient: QueryClient) => {
  await queryClient.getQueryCache().getAll().forEach(query => {
    if (query.state.fetchStatus === 'fetching') {
      return query.promise;
    }
  });
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';
