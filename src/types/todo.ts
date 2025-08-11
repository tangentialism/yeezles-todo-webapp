// Types based on the Yeezles Todo API

export interface Todo {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface TodoWithHtml extends Todo {
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

export interface Tag {
  id: number;
  name: string;
  usage_count: number;
  created_at: string;
  last_used: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
  html_processed?: boolean;
}

export interface TodayView {
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

export interface TodoFilters {
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

export interface CreateTodoRequest {
  title: string;
  description?: string;
  due_date?: string;
}

export interface UpdateTodoRequest {
  title?: string;
  description?: string;
  completed?: boolean;
  due_date?: string;
}
