import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import TokenAwareApiClient, { createAuthenticatedApiClient } from '../api';
import { createMockTodo, createMockArea, createMockApiResponse, createMockApiError, resetFactoryCounters } from '../../test/factories';
import type { TodoFilters, CreateTodoRequest, UpdateTodoRequest } from '../../types/todo';
import type { CreateAreaRequest, UpdateAreaRequest } from '../../types/area';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('TokenAwareApiClient', () => {
  let apiClient: TokenAwareApiClient;
  let mockGetToken: ReturnType<typeof vi.fn>;
  let mockOnAuthError: ReturnType<typeof vi.fn>;
  let mockAxiosInstance: any;

  const baseURL = 'https://test-api.example.com';

  beforeEach(() => {
    resetFactoryCounters();
    vi.clearAllMocks();

    // Setup mocks
    mockGetToken = vi.fn();
    mockOnAuthError = vi.fn();

    // Mock axios instance
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: {
          use: vi.fn(),
        },
        response: {
          use: vi.fn(),
        },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Create API client instance
    apiClient = new TokenAwareApiClient(baseURL, mockGetToken, mockOnAuthError);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor and Setup', () => {
    it('should create axios instance with correct baseURL', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should setup request interceptor for authentication', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      
      // Get the request interceptor function
      const [requestInterceptor] = mockAxiosInstance.interceptors.request.use.mock.calls[0];
      
      // Test with token
      mockGetToken.mockReturnValue('test-token');
      const configWithToken = { headers: {} };
      const result = requestInterceptor(configWithToken);
      
      expect(result.headers.Authorization).toBe('Bearer test-token');
    });

    it('should setup request interceptor without token', () => {
      const [requestInterceptor] = mockAxiosInstance.interceptors.request.use.mock.calls[0];
      
      // Test without token
      mockGetToken.mockReturnValue(null);
      const configWithoutToken = { headers: {} };
      const result = requestInterceptor(configWithoutToken);
      
      expect(result.headers.Authorization).toBeUndefined();
    });

    it('should setup response interceptor for error handling', () => {
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
      
      // Get the response interceptor functions
      const [successHandler, errorHandler] = mockAxiosInstance.interceptors.response.use.mock.calls[0];
      
      // Test success handler
      const mockResponse = { data: 'test' };
      expect(successHandler(mockResponse)).toBe(mockResponse);
      
      // Test error handler with 401
      const mockError = {
        response: {
          status: 401,
          data: 'Unauthorized',
        },
      };
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => errorHandler(mockError)).toThrow();
      expect(mockOnAuthError).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Health Check', () => {
    it('should make health check request', async () => {
      const mockHealthData = { status: 'healthy', timestamp: Date.now() };
      mockAxiosInstance.get.mockResolvedValue({ data: mockHealthData });

      const result = await apiClient.healthCheck();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health');
      expect(result).toEqual(mockHealthData);
    });

    it('should handle health check errors', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

      await expect(apiClient.healthCheck()).rejects.toThrow('Network error');
    });
  });

  describe('Todo Operations', () => {
    describe('getTodos', () => {
      it('should get todos without filters', async () => {
        const mockTodos = [createMockTodo(), createMockTodo()];
        const mockResponse = createMockApiResponse(mockTodos);
        mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

        const result = await apiClient.getTodos();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/todos?');
        expect(result).toEqual(mockResponse);
      });

      it('should get todos with filters', async () => {
        const filters: TodoFilters = {
          completed: true,
          tags: ['work', 'urgent'],
          tag_mode: 'any',
          due_date_from: '2024-01-01',
          due_date_to: '2024-12-31',
          search: 'test',
          sort_by: 'created_at',
          sort_order: 'desc',
          limit: 10,
          html: true,
          area_id: 1,
          area_name: 'Work',
          include_all_areas: false,
        };

        const mockTodos = [createMockTodo()];
        const mockResponse = createMockApiResponse(mockTodos);
        mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

        const result = await apiClient.getTodos(filters);

        const expectedParams = new URLSearchParams({
          completed: 'true',
          tags: 'work,urgent',
          tag_mode: 'any',
          due_date_from: '2024-01-01',
          due_date_to: '2024-12-31',
          search: 'test',
          sort_by: 'created_at',
          sort_order: 'desc',
          limit: '10',
          html: 'true',
          area_id: '1',
          area_name: 'Work',
          include_all_areas: 'false',
        });

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/todos?${expectedParams.toString()}`);
        expect(result).toEqual(mockResponse);
      });

      it('should handle partial filters', async () => {
        const filters: TodoFilters = {
          completed: false,
          area_id: 2,
        };

        const mockTodos = [createMockTodo()];
        const mockResponse = createMockApiResponse(mockTodos);
        mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

        const result = await apiClient.getTodos(filters);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/todos?completed=false&area_id=2');
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getTodo', () => {
      it('should get single todo without HTML', async () => {
        const mockTodo = createMockTodo({ id: 1 });
        const mockResponse = createMockApiResponse(mockTodo);
        mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

        const result = await apiClient.getTodo(1);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/todos/1');
        expect(result).toEqual(mockResponse);
      });

      it('should get single todo with HTML', async () => {
        const mockTodo = createMockTodo({ id: 1 });
        const mockResponse = createMockApiResponse(mockTodo);
        mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

        const result = await apiClient.getTodo(1, true);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/todos/1?html=true');
        expect(result).toEqual(mockResponse);
      });
    });

    describe('createTodo', () => {
      it('should create todo without HTML', async () => {
        const newTodo: CreateTodoRequest = {
          title: 'New Todo',
          description: 'Description',
          area_id: 1,
        };
        const mockTodo = createMockTodo(newTodo as any);
        const mockResponse = createMockApiResponse(mockTodo);
        mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

        const result = await apiClient.createTodo(newTodo);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/todos', newTodo);
        expect(result).toEqual(mockResponse);
      });

      it('should create todo with HTML', async () => {
        const newTodo: CreateTodoRequest = {
          title: 'New Todo',
          description: 'Description',
          area_id: 1,
        };
        const mockTodo = createMockTodo(newTodo as any);
        const mockResponse = createMockApiResponse(mockTodo);
        mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

        const result = await apiClient.createTodo(newTodo, true);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/todos?html=true', newTodo);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('updateTodo', () => {
      it('should update todo without HTML', async () => {
        const updates: UpdateTodoRequest = {
          title: 'Updated Todo',
          completed: true,
        };
        const mockTodo = createMockTodo({ id: 1, ...updates });
        const mockResponse = createMockApiResponse(mockTodo);
        mockAxiosInstance.put.mockResolvedValue({ data: mockResponse });

        const result = await apiClient.updateTodo(1, updates);

        expect(mockAxiosInstance.put).toHaveBeenCalledWith('/todos/1', updates);
        expect(result).toEqual(mockResponse);
      });

      it('should update todo with HTML', async () => {
        const updates: UpdateTodoRequest = {
          title: 'Updated Todo',
          completed: true,
        };
        const mockTodo = createMockTodo({ id: 1, ...updates });
        const mockResponse = createMockApiResponse(mockTodo);
        mockAxiosInstance.put.mockResolvedValue({ data: mockResponse });

        const result = await apiClient.updateTodo(1, updates, true);

        expect(mockAxiosInstance.put).toHaveBeenCalledWith('/todos/1?html=true', updates);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('deleteTodo', () => {
      it('should delete todo', async () => {
        const mockResponse = createMockApiResponse({ deleted: true });
        mockAxiosInstance.delete.mockResolvedValue({ data: mockResponse });

        const result = await apiClient.deleteTodo(1);

        expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/todos/1');
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getTodayView', () => {
      it('should get today view without HTML', async () => {
        const mockTodayView = {
          overdue: [createMockTodo()],
          today: [createMockTodo()],
          upcoming: [createMockTodo()],
        };
        const mockResponse = createMockApiResponse(mockTodayView);
        mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

        const result = await apiClient.getTodayView();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/todos/today');
        expect(result).toEqual(mockResponse);
      });

      it('should get today view with HTML', async () => {
        const mockTodayView = {
          overdue: [createMockTodo()],
          today: [createMockTodo()],
          upcoming: [createMockTodo()],
        };
        const mockResponse = createMockApiResponse(mockTodayView);
        mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

        const result = await apiClient.getTodayView(true);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/todos/today?html=true');
        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('Area Operations', () => {
    describe('getAreas', () => {
      it('should get all areas', async () => {
        const mockAreas = [createMockArea(), createMockArea()];
        const mockResponse = createMockApiResponse(mockAreas);
        mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

        const result = await apiClient.getAreas();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/areas');
        expect(result).toEqual(mockResponse);
      });
    });

    describe('createArea', () => {
      it('should create area', async () => {
        const newArea: CreateAreaRequest = {
          name: 'New Area',
          color: '#FF5733',
        };
        const mockArea = createMockArea(newArea as any);
        const mockResponse = createMockApiResponse(mockArea);
        mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

        const result = await apiClient.createArea(newArea);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/areas', newArea);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('updateArea', () => {
      it('should update area', async () => {
        const updates: UpdateAreaRequest = {
          name: 'Updated Area',
          color: '#33FF57',
        };
        const mockArea = createMockArea({ id: 1, ...updates });
        const mockResponse = createMockApiResponse(mockArea);
        mockAxiosInstance.put.mockResolvedValue({ data: mockResponse });

        const result = await apiClient.updateArea(1, updates);

        expect(mockAxiosInstance.put).toHaveBeenCalledWith('/areas/1', updates);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('deleteArea', () => {
      it('should delete area', async () => {
        const mockResponse = createMockApiResponse({ deleted: true });
        mockAxiosInstance.delete.mockResolvedValue({ data: mockResponse });

        const result = await apiClient.deleteArea(1);

        expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/areas/1');
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getAreaStats', () => {
      it('should get area stats', async () => {
        const mockAreaStats = {
          ...createMockArea({ id: 1 }),
          totalTodos: 10,
          completedTodos: 5,
          pendingTodos: 5,
        };
        const mockResponse = createMockApiResponse(mockAreaStats);
        mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

        const result = await apiClient.getAreaStats(1);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/areas/1/stats');
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getAvailableColors', () => {
      it('should get available colors', async () => {
        const mockColors = ['#FF5733', '#33FF57', '#3357FF'];
        const mockResponse = createMockApiResponse(mockColors);
        mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

        const result = await apiClient.getAvailableColors();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/areas/colors');
        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

      await expect(apiClient.getTodos()).rejects.toThrow('Network error');
    });

    it('should handle API errors with response', async () => {
      const apiError = createMockApiError('Bad request', 400);
      mockAxiosInstance.get.mockRejectedValue({
        response: {
          status: 400,
          data: apiError,
        },
      });

      await expect(apiClient.getTodos()).rejects.toThrow();
    });

    it('should trigger auth error callback on 401', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Simulate the response interceptor error handler
      const [, errorHandler] = mockAxiosInstance.interceptors.response.use.mock.calls[0];
      
      const authError = {
        response: {
          status: 401,
          data: 'Unauthorized',
        },
      };

      expect(() => errorHandler(authError)).toThrow();
      expect(mockOnAuthError).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should not trigger auth error callback on other status codes', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const [, errorHandler] = mockAxiosInstance.interceptors.response.use.mock.calls[0];
      
      const serverError = {
        response: {
          status: 500,
          data: 'Internal server error',
        },
      };

      expect(() => errorHandler(serverError)).toThrow();
      expect(mockOnAuthError).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete todo workflow', async () => {
      // Create todo
      const createRequest: CreateTodoRequest = {
        title: 'Integration Test Todo',
        description: 'Testing complete workflow',
        area_id: 1,
      };
      const createdTodo = createMockTodo({ id: 1, ...createRequest });
      mockAxiosInstance.post.mockResolvedValueOnce({ 
        data: createMockApiResponse(createdTodo) 
      });

      const createResult = await apiClient.createTodo(createRequest);
      expect(createResult.success).toBe(true);

      // Update todo
      const updateRequest: UpdateTodoRequest = { completed: true };
      const updatedTodo = createMockTodo({ ...createdTodo, completed: true });
      mockAxiosInstance.put.mockResolvedValueOnce({ 
        data: createMockApiResponse(updatedTodo) 
      });

      const updateResult = await apiClient.updateTodo(1, updateRequest);
      expect(updateResult.success).toBe(true);

      // Delete todo
      mockAxiosInstance.delete.mockResolvedValueOnce({ 
        data: createMockApiResponse({ deleted: true }) 
      });

      const deleteResult = await apiClient.deleteTodo(1);
      expect(deleteResult.success).toBe(true);
    });

    it('should handle area management workflow', async () => {
      // Create area
      const createRequest: CreateAreaRequest = {
        name: 'Test Area',
        color: '#FF5733',
      };
      const createdArea = createMockArea({ id: 1, ...createRequest });
      mockAxiosInstance.post.mockResolvedValueOnce({ 
        data: createMockApiResponse(createdArea) 
      });

      const createResult = await apiClient.createArea(createRequest);
      expect(createResult.success).toBe(true);

      // Get area stats
      const areaStats = {
        ...createdArea,
        totalTodos: 5,
        completedTodos: 2,
        pendingTodos: 3,
      };
      mockAxiosInstance.get.mockResolvedValueOnce({ 
        data: createMockApiResponse(areaStats) 
      });

      const statsResult = await apiClient.getAreaStats(1);
      expect(statsResult.success).toBe(true);
    });
  });
});

describe('createAuthenticatedApiClient', () => {
  it('should create TokenAwareApiClient with correct parameters', () => {
    const mockGetToken = vi.fn();
    const mockOnAuthError = vi.fn();

    // Mock environment variable
    vi.stubEnv('VITE_API_BASE_URL', 'https://custom-api.example.com');

    const apiClient = createAuthenticatedApiClient(mockGetToken, mockOnAuthError);

    expect(apiClient).toBeInstanceOf(TokenAwareApiClient);
    expect(mockedAxios.create).toHaveBeenCalledWith({
      baseURL: 'https://custom-api.example.com',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    vi.unstubAllEnvs();
  });

  it('should use default URL when environment variable is not set', () => {
    const mockGetToken = vi.fn();
    const mockOnAuthError = vi.fn();

    const apiClient = createAuthenticatedApiClient(mockGetToken, mockOnAuthError);

    expect(apiClient).toBeInstanceOf(TokenAwareApiClient);
    expect(mockedAxios.create).toHaveBeenCalledWith({
      baseURL: 'https://yeezles-todo-production.up.railway.app',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });
});
