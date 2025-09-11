import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type { 
  Todo, 
  ApiResponse, 
  TodayView, 
  TodoFilters, 
  CreateTodoRequest, 
  UpdateTodoRequest
} from '../types/todo';
import type {
  Area,
  AreaWithStats,
  CreateAreaRequest,
  UpdateAreaRequest
} from '../types/area';

// Authentication types
export interface LoginRequest {
  googleToken: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: {
      email: string;
      name: string;
      picture?: string;
    };
    sessionCreated: boolean;
    rememberMeEnabled: boolean;
  };
}

export interface ValidatePersistentResponse {
  success: boolean;
  data: {
    user: {
      email: string;
      name: string;
      authMethod: string;
    };
    session: {
      id: number;
      platform: string;
      lastUsed: string;
      expiresAt: string;
    };
    tokenRotated: boolean;
  };
}

export interface UserSession {
  id: number;
  platform: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  userAgentHash: string;
  isCurrent: boolean;
}

export interface SessionsResponse {
  success: boolean;
  data: {
    sessions: UserSession[];
    totalCount: number;
  };
}

class TokenAwareApiClient {
  private api: AxiosInstance;
  private baseURL: string;
  private getToken: () => string | null;
  private onAuthError: () => void;

  constructor(
    baseURL: string,
    getToken: () => string | null,
    onAuthError: () => void
  ) {
    this.baseURL = baseURL;
    this.getToken = getToken;
    this.onAuthError = onAuthError;
    
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Include cookies in requests
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error);
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
          
          // Handle authentication errors
          if (error.response.status === 401) {
            this.onAuthError();
          }
        }
        throw error;
      }
    );
  }

  // Health check
  async healthCheck(): Promise<any> {
    const response = await this.api.get('/health');
    return response.data;
  }

  // Authentication Methods

  /**
   * Login with Google token and optional remember me
   */
  async login(loginData: LoginRequest): Promise<LoginResponse> {
    console.log('🔍 [Frontend API] Sending login request:', loginData);
    console.log('🔍 [Frontend API] Cookies before login:', document.cookie);
    
    const response = await this.api.post('/auth/login', loginData);
    
    console.log('🔍 [Frontend API] Login response status:', response.status);
    console.log('🔍 [Frontend API] Login response headers:', response.headers);
    console.log('🔍 [Frontend API] Login response data:', response.data);
    console.log('🔍 [Frontend API] Cookies after login:', document.cookie);
    
    return response.data;
  }

  /**
   * Validate persistent session from cookie
   */
  async validatePersistentSession(): Promise<ValidatePersistentResponse> {
    console.log('🔍 [Frontend API] About to validate persistent session');
    console.log('🔍 [Frontend API] Current cookies before request:', document.cookie);
    
    const response = await this.api.post('/auth/validate-persistent');
    
    console.log('🔍 [Frontend API] Validation response status:', response.status);
    console.log('🔍 [Frontend API] Validation response data:', response.data);
    
    return response.data;
  }

  /**
   * Get user's active sessions
   */
  async getUserSessions(): Promise<SessionsResponse> {
    const response = await this.api.get('/auth/sessions');
    return response.data;
  }

  /**
   * Revoke specific session
   */
  async revokeSession(sessionId: number): Promise<ApiResponse<{ sessionId: number; revoked: boolean }>> {
    const response = await this.api.delete(`/auth/sessions/${sessionId}`);
    return response.data;
  }

  /**
   * Revoke all sessions (sign out everywhere)
   */
  async revokeAllSessions(): Promise<ApiResponse<{ revokedCount: number; message: string }>> {
    const response = await this.api.delete('/auth/sessions');
    return response.data;
  }

  // Get all todos with filtering
  async getTodos(filters: TodoFilters = {}): Promise<ApiResponse<Todo[]>> {
    const params = new URLSearchParams();
    
    if (filters.completed !== undefined) params.append('completed', filters.completed.toString());
    if (filters.tags && filters.tags.length > 0) params.append('tags', filters.tags.join(','));
    if (filters.tag_mode) params.append('tag_mode', filters.tag_mode);
    if (filters.due_date_from) params.append('due_date_from', filters.due_date_from);
    if (filters.due_date_to) params.append('due_date_to', filters.due_date_to);
    if (filters.search) params.append('search', filters.search);
    if (filters.sort_by) params.append('sort_by', filters.sort_by);
    if (filters.sort_order) params.append('sort_order', filters.sort_order);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.html) params.append('html', filters.html.toString());
    if (filters.area_id !== undefined) params.append('area_id', filters.area_id.toString());
    if (filters.area_name) params.append('area_name', filters.area_name);
    if (filters.include_all_areas) params.append('include_all_areas', filters.include_all_areas.toString());

    const response = await this.api.get(`/todos?${params.toString()}`);
    return response.data;
  }

  // Get single todo
  async getTodo(id: number, html: boolean = false): Promise<ApiResponse<Todo>> {
    const params = html ? '?html=true' : '';
    const response = await this.api.get(`/todos/${id}${params}`);
    return response.data;
  }

  // Create new todo
  async createTodo(todo: CreateTodoRequest, html: boolean = false): Promise<ApiResponse<Todo>> {
    const params = html ? '?html=true' : '';
    const response = await this.api.post(`/todos${params}`, todo);
    return response.data;
  }

  // Update todo
  async updateTodo(id: number, updates: UpdateTodoRequest, html: boolean = false): Promise<ApiResponse<Todo>> {
    const params = html ? '?html=true' : '';
    const response = await this.api.put(`/todos/${id}${params}`, updates);
    return response.data;
  }

  // Delete todo
  async deleteTodo(id: number): Promise<ApiResponse<void>> {
    const response = await this.api.delete(`/todos/${id}`);
    return response.data;
  }

  // Move todo to today list
  async moveToToday(id: number, html: boolean = false): Promise<ApiResponse<Todo>> {
    const params = html ? '?html=true' : '';
    const response = await this.api.post(`/todos/${id}/move-to-today${params}`);
    return response.data;
  }

  // Remove todo from today list
  async removeFromToday(id: number, html: boolean = false): Promise<ApiResponse<Todo>> {
    const params = html ? '?html=true' : '';
    const response = await this.api.post(`/todos/${id}/remove-from-today${params}`);
    return response.data;
  }

  // Get today view
  async getTodayView(
    includeDueToday: boolean = true,
    daysAhead?: number,
    html: boolean = false
  ): Promise<ApiResponse<TodayView>> {
    const params = new URLSearchParams();
    params.append('include_due_today', includeDueToday.toString());
    if (daysAhead !== undefined) params.append('days_ahead', daysAhead.toString());
    if (html) params.append('html', html.toString());

    const response = await this.api.get(`/todos/today?${params.toString()}`);
    return response.data;
  }

  // Export data
  async exportData(
    includeCompleted: boolean = true,
    includeTags: boolean = true
  ): Promise<any> {
    const params = new URLSearchParams();
    params.append('include_completed', includeCompleted.toString());
    params.append('include_tags', includeTags.toString());

    const response = await this.api.get(`/export?${params.toString()}`);
    return response.data;
  }

  // Import data
  async importData(data: any, options: any = {}): Promise<any> {
    const response = await this.api.post('/import', { data, options });
    return response.data;
  }

  // === AREA METHODS ===

  // Get all areas (with optional statistics)
  async getAreas(includeStats: boolean = false): Promise<ApiResponse<Area[] | AreaWithStats[]>> {
    const params = includeStats ? '?include_stats=true' : '';
    const response = await this.api.get(`/areas${params}`);
    return response.data;
  }

  // Get single area by ID
  async getArea(id: number): Promise<ApiResponse<Area>> {
    const response = await this.api.get(`/areas/${id}`);
    return response.data;
  }

  // Get area statistics
  async getAreaStats(id: number): Promise<ApiResponse<AreaWithStats>> {
    const response = await this.api.get(`/areas/${id}/stats`);
    return response.data;
  }

  // Create new area
  async createArea(area: CreateAreaRequest): Promise<ApiResponse<Area>> {
    const response = await this.api.post('/areas', area);
    return response.data;
  }

  // Update area
  async updateArea(id: number, updates: UpdateAreaRequest): Promise<ApiResponse<Area>> {
    const response = await this.api.put(`/areas/${id}`, updates);
    return response.data;
  }

  // Delete area
  async deleteArea(id: number): Promise<ApiResponse<void>> {
    const response = await this.api.delete(`/areas/${id}`);
    return response.data;
  }

  // Get available Material Design colors
  async getAvailableColors(): Promise<ApiResponse<string[]>> {
    const response = await this.api.get('/areas/colors');
    return response.data;
  }
}

// Factory function to create authenticated API client
export const createAuthenticatedApiClient = (
  getToken: () => string | null,
  onAuthError: () => void
): TokenAwareApiClient => {
  return new TokenAwareApiClient(
    import.meta.env.VITE_API_BASE_URL || 'https://api.yeezlestodo.com',
    getToken,
    onAuthError
  );
};

// Legacy TodoApi class removed - all components now use TokenAwareApiClient

export default TokenAwareApiClient;
