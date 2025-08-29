// Area-related types
export interface Area {
  id: number;
  user_id: string;
  name: string;
  color: string; // Material Design hex color (#RRGGBB)
  reference_code: string; // URL-safe reference code
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAreaRequest {
  name: string;
  color: string;
}

export interface UpdateAreaRequest {
  name?: string;
  color?: string;
}

export interface AreaWithStats extends Area {
  stats: {
    total_todos: number;
    completed_todos: number;
    pending_todos: number;
    completion_rate: number;
  };
}
