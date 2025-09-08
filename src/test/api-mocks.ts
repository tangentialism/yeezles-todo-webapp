import { vi, type MockedFunction } from 'vitest';
import type { Todo, ApiResponse, TodayView, TodoFilters } from '../types/todo';
import type { Area, AreaWithStats } from '../types/area';
import { createMockApiResponse, createMockApiError } from './factories';

/**
 * API Mock utilities for testing HTTP requests
 */

// Type for our mocked fetch function
type MockedFetch = MockedFunction<typeof fetch>;

/**
 * Setup fetch mock with default successful responses
 */
export const setupFetchMock = () => {
  const mockFetch = vi.fn() as MockedFetch;
  global.fetch = mockFetch;
  return mockFetch;
};

/**
 * Create a mock Response object
 */
const createMockResponse = (data: any, options: { status?: number; ok?: boolean } = {}) => {
  const { status = 200, ok = true } = options;
  
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
    headers: new Headers(),
  } as unknown as Response;
};

/**
 * Mock successful API responses
 */
export const mockApiSuccess = {
  // Todo endpoints
  getTodos: (todos: Todo[] = []) => 
    createMockResponse(createMockApiResponse(todos)),
  
  getTodo: (todo: Todo) => 
    createMockResponse(createMockApiResponse(todo)),
  
  createTodo: (todo: Todo) => 
    createMockResponse(createMockApiResponse(todo), { status: 201 }),
  
  updateTodo: (todo: Todo) => 
    createMockResponse(createMockApiResponse(todo)),
  
  deleteTodo: () => 
    createMockResponse(createMockApiResponse({ deleted: true })),
  
  getTodayView: (todayView: TodayView) => 
    createMockResponse(createMockApiResponse(todayView)),

  // Area endpoints
  getAreas: (areas: Area[] = []) => 
    createMockResponse(createMockApiResponse(areas)),
  
  getArea: (area: Area) => 
    createMockResponse(createMockApiResponse(area)),
  
  createArea: (area: Area) => 
    createMockResponse(createMockApiResponse(area), { status: 201 }),
  
  updateArea: (area: Area) => 
    createMockResponse(createMockApiResponse(area)),
  
  deleteArea: () => 
    createMockResponse(createMockApiResponse({ deleted: true })),
  
  getAreaStats: (areaStats: AreaWithStats) => 
    createMockResponse(createMockApiResponse(areaStats)),
  
  getAvailableColors: (colors: string[] = ['#3B82F6', '#10B981', '#F59E0B']) => 
    createMockResponse(createMockApiResponse(colors)),
};

/**
 * Mock API error responses
 */
export const mockApiError = {
  unauthorized: () => 
    createMockResponse(
      createMockApiError('Unauthorized', 401),
      { status: 401, ok: false }
    ),
  
  forbidden: () => 
    createMockResponse(
      createMockApiError('Forbidden', 403),
      { status: 403, ok: false }
    ),
  
  notFound: () => 
    createMockResponse(
      createMockApiError('Not found', 404),
      { status: 404, ok: false }
    ),
  
  serverError: () => 
    createMockResponse(
      createMockApiError('Internal server error', 500),
      { status: 500, ok: false }
    ),
  
  networkError: () => 
    Promise.reject(new Error('Network error')),
  
  validationError: (message: string = 'Validation failed') => 
    createMockResponse(
      createMockApiError(message, 400),
      { status: 400, ok: false }
    ),
};

/**
 * API endpoint matchers - helper functions to check if fetch was called with specific endpoints
 */
export const apiEndpoints = {
  todos: {
    list: (baseUrl: string = 'http://localhost:3000') => `${baseUrl}/api/todos`,
    create: (baseUrl: string = 'http://localhost:3000') => `${baseUrl}/api/todos`,
    get: (id: string, baseUrl: string = 'http://localhost:3000') => `${baseUrl}/api/todos/${id}`,
    update: (id: string, baseUrl: string = 'http://localhost:3000') => `${baseUrl}/api/todos/${id}`,
    delete: (id: string, baseUrl: string = 'http://localhost:3000') => `${baseUrl}/api/todos/${id}`,
    today: (baseUrl: string = 'http://localhost:3000') => `${baseUrl}/api/todos/today`,
  },
  areas: {
    list: (baseUrl: string = 'http://localhost:3000') => `${baseUrl}/api/areas`,
    create: (baseUrl: string = 'http://localhost:3000') => `${baseUrl}/api/areas`,
    get: (id: string, baseUrl: string = 'http://localhost:3000') => `${baseUrl}/api/areas/${id}`,
    update: (id: string, baseUrl: string = 'http://localhost:3000') => `${baseUrl}/api/areas/${id}`,
    delete: (id: string, baseUrl: string = 'http://localhost:3000') => `${baseUrl}/api/areas/${id}`,
    stats: (id: string, baseUrl: string = 'http://localhost:3000') => `${baseUrl}/api/areas/${id}/stats`,
    colors: (baseUrl: string = 'http://localhost:3000') => `${baseUrl}/api/areas/colors`,
  },
};

/**
 * Helper to setup common API mock scenarios
 */
export const setupApiMocks = (mockFetch: MockedFetch) => {
  return {
    // Success scenarios
    mockTodosSuccess: (todos: Todo[] = []) => {
      mockFetch.mockResolvedValueOnce(mockApiSuccess.getTodos(todos));
    },
    
    mockAreasSuccess: (areas: Area[] = []) => {
      mockFetch.mockResolvedValueOnce(mockApiSuccess.getAreas(areas));
    },
    
    mockCreateTodoSuccess: (todo: Todo) => {
      mockFetch.mockResolvedValueOnce(mockApiSuccess.createTodo(todo));
    },
    
    mockUpdateTodoSuccess: (todo: Todo) => {
      mockFetch.mockResolvedValueOnce(mockApiSuccess.updateTodo(todo));
    },
    
    // Error scenarios
    mockUnauthorized: () => {
      mockFetch.mockResolvedValueOnce(mockApiError.unauthorized());
    },
    
    mockServerError: () => {
      mockFetch.mockResolvedValueOnce(mockApiError.serverError());
    },
    
    mockNetworkError: () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
    },
    
    // Reset all mocks
    reset: () => {
      mockFetch.mockClear();
    },
  };
};

/**
 * Utility to verify API calls
 */
export const verifyApiCall = (mockFetch: MockedFetch, url: string, options?: RequestInit) => {
  const calls = mockFetch.mock.calls;
  const matchingCall = calls.find(call => {
    const [callUrl, callOptions] = call;
    
    // Check URL
    if (callUrl !== url) return false;
    
    // Check method if specified
    if (options?.method && callOptions?.method !== options.method) return false;
    
    return true;
  });
  
  return {
    wasCalled: !!matchingCall,
    callCount: calls.filter(call => call[0] === url).length,
    lastCall: matchingCall,
    allCalls: calls,
  };
};

/**
 * Helper to assert API calls in tests
 */
export const expectApiCall = (mockFetch: MockedFetch, url: string, options?: RequestInit) => {
  const result = verifyApiCall(mockFetch, url, options);
  
  if (!result.wasCalled) {
    throw new Error(`Expected API call to ${url} but it was not made. Actual calls: ${result.allCalls.map(call => call[0]).join(', ')}`);
  }
  
  return result;
};
