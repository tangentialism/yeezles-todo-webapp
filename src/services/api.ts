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
}

// Factory function to create authenticated API client
export const createAuthenticatedApiClient = (
  getToken: () => string | null,
  onAuthError: () => void
): TokenAwareApiClient => {
  return new TokenAwareApiClient(
    import.meta.env.VITE_API_BASE_URL || 'https://yeezles-todo-production.up.railway.app',
    getToken,
    onAuthError
  );
};

// Legacy TodoApi class removed - all components now use TokenAwareApiClient

export default TokenAwareApiClient;
