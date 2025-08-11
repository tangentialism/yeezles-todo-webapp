import axios from 'axios';

// Type definitions for the API
interface Todo {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface Tag {
  id: number;
  name: string;
  usage_count: number;
  created_at: string;
  last_used: string;
}

interface TodoWithHtml extends Todo {
  tags?: Tag[];
  title_html: string;
  description_html: string;
  cross_references: {
    incoming: Array<{ id: number; title: string }>;
    outgoing: Array<{ id: number; title: string }>;
  };
  link_processing: {
    title: {
      references: number[];
      broken_references: number[];
    };
    description: {
      references: number[];
      broken_references: number[];
    };
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
  html_processed?: boolean;
}

interface TodayView {
  focus: {
    today_tagged: Todo[];
    due_today: Todo[];
    overdue: Todo[];
    total_today: number;
    total_focus: number;
  };
  upcoming: {
    coming_soon: Todo[];
    total_coming_soon: number;
  };
  summary: {
    total_today_items: number;
    total_overdue: number;
    total_coming_soon: number;
    total_focus_items: number;
    needs_attention: boolean;
  };
}

interface TodoFilters {
  completed?: boolean;
  tags?: string[];
  tag_mode?: 'AND' | 'OR';
  due_date_from?: string;
  due_date_to?: string;
  search?: string;
  sort_by?: 'created_at' | 'updated_at' | 'due_date' | 'completed_at';
  sort_order?: 'ASC' | 'DESC';
  limit?: number;
  html?: boolean;
}

interface CreateTodoRequest {
  title: string;
  description?: string;
  due_date?: string;
}

interface UpdateTodoRequest {
  title?: string;
  description?: string;
  completed?: boolean;
  due_date?: string;
}

class TodoApi {
  private api: any;

  constructor(baseURL: string = 'https://yeezles-todo-production.up.railway.app', apiKey?: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add API key if provided
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    this.api = axios.create({
      baseURL,
      headers,
    });

    // Add request interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error);
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
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
  async getTodos(filters: any = {}): Promise<any> {
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
  async getTodo(id: number, html: boolean = false): Promise<any> {
    const params = html ? '?html=true' : '';
    const response = await this.api.get(`/todos/${id}${params}`);
    return response.data;
  }

  // Create new todo
  async createTodo(todo: any, html: boolean = false): Promise<any> {
    const params = html ? '?html=true' : '';
    const response = await this.api.post(`/todos${params}`, todo);
    return response.data;
  }

  // Update todo
  async updateTodo(id: number, updates: any, html: boolean = false): Promise<any> {
    const params = html ? '?html=true' : '';
    const response = await this.api.put(`/todos/${id}${params}`, updates);
    return response.data;
  }

  // Delete todo
  async deleteTodo(id: number): Promise<any> {
    const response = await this.api.delete(`/todos/${id}`);
    return response.data;
  }

  // Get today view
  async getTodayView(
    includeDueToday: boolean = true,
    daysAhead?: number,
    html: boolean = false
  ): Promise<any> {
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

// Create singleton instance
export const todoApi = new TodoApi(
  import.meta.env.VITE_API_BASE_URL || 'https://yeezles-todo-production.up.railway.app',
  import.meta.env.VITE_API_KEY
);

export default TodoApi;
