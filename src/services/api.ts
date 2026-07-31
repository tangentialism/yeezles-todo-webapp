/**
 * Authenticated API client for the Yeezles Todo backend.
 *
 * Wraps axios with automatic token injection (via request interceptor) and
 * centralized 401 handling (via response interceptor). All methods correspond
 * to REST endpoints on the backend.
 */
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
import { logger } from '../utils/logger';

/** Request body for `POST /auth/login`. */
export interface LoginRequest {
  googleToken: string;
  rememberMe?: boolean;
}

/** Response from `POST /auth/login`. */
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

/** Response from `POST /auth/validate-persistent`. */
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

/** A single persistent login session as returned by `GET /auth/sessions`. */
export interface UserSession {
  id: number;
  platform: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  userAgentHash: string;
  isCurrent: boolean;
}

/** Response from `GET /auth/sessions`. */
export interface SessionsResponse {
  success: boolean;
  data: {
    sessions: UserSession[];
    totalCount: number;
  };
}

/** Response from `GET /auth/session-health`. */
export interface SessionHealthResponse {
  success: boolean;
  data: {
    hasSession: boolean;
    isValid: boolean;
    sessionId?: number;
    platform?: string;
    expiresAt?: string;
    daysUntilExpiry?: number;
    needsRefreshWarning?: boolean;
    lastUsedAt?: string;
    userEmail?: string;
    message?: string;
  };
}

/**
 * HTTP client that automatically attaches the user's auth token to every
 * request and triggers a logout callback on 401 responses.
 *
 * Not instantiated directly -- use {@link createAuthenticatedApiClient}.
 */
class TokenAwareApiClient {
  private api: AxiosInstance;
  private baseURL: string;
  private getToken: () => string | null;
  private onAuthError: () => void;

  /**
   * @param baseURL - Backend API root (e.g. `https://api.yeezlestodo.com`)
   * @param getToken - Returns the current Google ID token, or null if expired
   * @param onAuthError - Invoked on 401 responses to force a re-login
   */
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
        logger.error('API Error:', error);
        if (error.response) {
          logger.error('Response status:', error.response.status);

          // Handle authentication errors
          if (error.response.status === 401) {
            logger.error('Authentication failed - triggering auth error handler');
            this.onAuthError();
          }
        } else if (error.request) {
          logger.error('Network error - no response received');
        } else {
          logger.error('Request configuration error:', error.message);
        }
        throw error;
      }
    );
  }

  /**
   * `GET /health` -- verify backend connectivity.
   * @returns Object with a `status` string (e.g. "ok").
   */
  async healthCheck(): Promise<{ status: string }> {
    const response = await this.api.get('/health');
    return response.data;
  }

  // ── Authentication Methods ──────────────────────────────────────────

  /**
   * `POST /auth/login` -- exchange a Google token for an authenticated session.
   * @param loginData - Google token and optional remember-me flag.
   * @returns Login result including whether a persistent session was created.
   */
  async login(loginData: LoginRequest): Promise<LoginResponse> {
    logger.log('[Frontend API] Sending login request');

    const response = await this.api.post('/auth/login', loginData);

    logger.log('[Frontend API] Login response status:', response.status);

    return response.data;
  }

  /**
   * `POST /auth/validate-persistent` -- validate the persistent session cookie.
   * No auth token needed; the httpOnly cookie is sent automatically.
   */
  async validatePersistentSession(): Promise<ValidatePersistentResponse> {
    logger.log('[Frontend API] Validating persistent session');

    const response = await this.api.post('/auth/validate-persistent');

    logger.log('[Frontend API] Validation response status:', response.status);

    return response.data;
  }

  /**
   * `GET /auth/sessions` -- list the user's active persistent sessions.
   * Requires authentication.
   */
  async getUserSessions(): Promise<SessionsResponse> {
    const response = await this.api.get('/auth/sessions');
    return response.data;
  }

  /**
   * `DELETE /auth/sessions/:id` -- revoke a specific session.
   * @param sessionId - ID of the session to revoke.
   */
  async revokeSession(sessionId: number): Promise<ApiResponse<{ sessionId: number; revoked: boolean }>> {
    const response = await this.api.delete(`/auth/sessions/${sessionId}`);
    return response.data;
  }

  /**
   * `DELETE /auth/sessions` -- revoke all persistent sessions (sign out everywhere).
   */
  async revokeAllSessions(): Promise<ApiResponse<{ revokedCount: number; message: string }>> {
    const response = await this.api.delete('/auth/sessions');
    return response.data;
  }

  /**
   * `POST /auth/logout` -- end THIS browser's session and clear its cookie.
   *
   * Distinct from revokeAllSessions(): ordinary sign-out must not sign the
   * user's other devices out. Before this existed, signing out cleared only
   * local state while the httpOnly cookie and its server-side session
   * survived, so the next page load silently signed the user back in.
   */
  async logout(): Promise<ApiResponse<{ loggedOut: boolean }>> {
    const response = await this.api.post('/auth/logout');
    return response.data;
  }

  /**
   * `GET /auth/session-health` -- check session validity and expiration info.
   * Used to show refresh warnings before the session expires.
   */
  async getSessionHealth(): Promise<SessionHealthResponse> {
    logger.log('[Frontend API] Checking session health...');

    const response = await this.api.get('/auth/session-health');

    logger.log('[Frontend API] Health check response status:', response.status);

    return response.data;
  }

  // ── Todo Methods ────────────────────────────────────────────────────

  /**
   * `GET /todos` -- fetch todos with optional filtering, sorting, and area scoping.
   * @param filters - Query parameters for filtering/sorting.
   */
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

  /**
   * `GET /todos/:id` -- fetch a single todo by ID.
   * @param id - Todo ID.
   * @param html - When true, includes server-rendered HTML fields.
   */
  async getTodo(id: number, html: boolean = false): Promise<ApiResponse<Todo>> {
    const params = html ? '?html=true' : '';
    const response = await this.api.get(`/todos/${id}${params}`);
    return response.data;
  }

  /**
   * `POST /todos` -- create a new todo.
   * @param todo - Todo data to create.
   * @param html - When true, the response includes HTML-rendered fields.
   */
  async createTodo(todo: CreateTodoRequest, html: boolean = false): Promise<ApiResponse<Todo>> {
    const params = html ? '?html=true' : '';
    const response = await this.api.post(`/todos${params}`, todo);
    return response.data;
  }

  /**
   * `POST /todos/categorize` -- get an AI-suggested area for a todo.
   * @param title - Todo title to categorize.
   * @param description - Optional description for better categorization.
   */
  async categorizeTodo(title: string, description?: string): Promise<ApiResponse<{
    area_id: number | null;
    area_name: string | null;
    confidence: 'high' | 'medium' | 'low';
    reasoning?: string;
    ai_available: boolean;
  }>> {
    const response = await this.api.post('/todos/categorize', { title, description });
    return response.data;
  }

  /**
   * `PUT /todos/:id` -- partially update a todo.
   * @param id - Todo ID.
   * @param updates - Fields to update.
   * @param html - When true, the response includes HTML-rendered fields.
   */
  async updateTodo(id: number, updates: UpdateTodoRequest, html: boolean = false): Promise<ApiResponse<Todo>> {
    const params = html ? '?html=true' : '';
    const response = await this.api.put(`/todos/${id}${params}`, updates);
    return response.data;
  }

  /**
   * `DELETE /todos/:id` -- permanently delete a todo.
   * @param id - Todo ID.
   */
  async deleteTodo(id: number): Promise<ApiResponse<void>> {
    const response = await this.api.delete(`/todos/${id}`);
    return response.data;
  }

  /**
   * `POST /todos/:id/move-to-today` -- pin a todo to the Today focus list.
   * @param id - Todo ID.
   * @param html - When true, the response includes HTML-rendered fields.
   */
  async moveToToday(id: number, html: boolean = false): Promise<ApiResponse<Todo>> {
    const params = html ? '?html=true' : '';
    const response = await this.api.post(`/todos/${id}/move-to-today${params}`);
    return response.data;
  }

  /**
   * `POST /todos/:id/remove-from-today` -- unpin a todo from the Today focus list.
   * @param id - Todo ID.
   * @param html - When true, the response includes HTML-rendered fields.
   */
  async removeFromToday(id: number, html: boolean = false): Promise<ApiResponse<Todo>> {
    const params = html ? '?html=true' : '';
    const response = await this.api.post(`/todos/${id}/remove-from-today${params}`);
    return response.data;
  }

  /**
   * `GET /todos/today` -- fetch the structured Today view with focus/upcoming sections.
   * @param includeDueToday - Include todos with today's due date.
   * @param daysAhead - Number of days to look ahead for upcoming todos.
   * @param html - When true, includes HTML-rendered fields.
   */
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

  /**
   * `GET /export` -- export all user data as JSON.
   * @param includeCompleted - Whether to include completed todos.
   * @param includeTags - Whether to include tag data.
   */
  async exportData(
    includeCompleted: boolean = true,
    includeTags: boolean = true
  ): Promise<Record<string, unknown>> {
    const params = new URLSearchParams();
    params.append('include_completed', includeCompleted.toString());
    params.append('include_tags', includeTags.toString());

    const response = await this.api.get(`/export?${params.toString()}`);
    return response.data;
  }

  /**
   * `POST /import` -- import data from a JSON export.
   * @param data - The exported data payload.
   * @param options - Import options (e.g. merge strategy).
   */
  async importData(data: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const response = await this.api.post('/import', { data, options });
    return response.data;
  }

  // ── Area Methods ────────────────────────────────────────────────────

  /**
   * `GET /areas` -- fetch all areas, optionally with todo statistics.
   * @param includeStats - When true, each area includes aggregated todo counts.
   */
  async getAreas(includeStats: boolean = false): Promise<ApiResponse<Area[] | AreaWithStats[]>> {
    const params = includeStats ? '?include_stats=true' : '';
    const response = await this.api.get(`/areas${params}`);
    return response.data;
  }

  /**
   * `GET /areas/:id` -- fetch a single area by ID.
   * @param id - Area ID.
   */
  async getArea(id: number): Promise<ApiResponse<Area>> {
    const response = await this.api.get(`/areas/${id}`);
    return response.data;
  }

  /**
   * `GET /areas/:id/stats` -- fetch an area with its todo statistics.
   * @param id - Area ID.
   */
  async getAreaStats(id: number): Promise<ApiResponse<AreaWithStats>> {
    const response = await this.api.get(`/areas/${id}/stats`);
    return response.data;
  }

  /**
   * `POST /areas` -- create a new area.
   * @param area - Area name, color, and optional description.
   */
  async createArea(area: CreateAreaRequest): Promise<ApiResponse<Area>> {
    const response = await this.api.post('/areas', area);
    return response.data;
  }

  /**
   * `PUT /areas/:id` -- update an existing area.
   * @param id - Area ID.
   * @param updates - Fields to update.
   */
  async updateArea(id: number, updates: UpdateAreaRequest): Promise<ApiResponse<Area>> {
    const response = await this.api.put(`/areas/${id}`, updates);
    return response.data;
  }

  /**
   * `DELETE /areas/:id` -- permanently delete an area.
   * Todos in the deleted area are reassigned to the default area.
   * @param id - Area ID.
   */
  async deleteArea(id: number): Promise<ApiResponse<void>> {
    const response = await this.api.delete(`/areas/${id}`);
    return response.data;
  }

  /**
   * `GET /areas/colors` -- fetch available Material Design colors for area creation.
   * @returns Array of hex color strings.
   */
  async getAvailableColors(): Promise<ApiResponse<string[]>> {
    const response = await this.api.get('/areas/colors');
    return response.data;
  }
}

/**
 * Factory function to create an authenticated API client.
 *
 * @param getToken - Returns the user's current Google ID token or null.
 * @param onAuthError - Called when the backend returns a 401, typically triggers logout.
 * @returns A configured {@link TokenAwareApiClient} instance.
 */
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
