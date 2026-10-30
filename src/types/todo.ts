/**
 * Core type definitions for the Yeezles Todo API.
 *
 * These interfaces mirror the backend REST API response shapes and are
 * used by the API service, hooks, and components throughout the app.
 */

import type { TopicRef } from './topic';
import type { PersonIdRef, TodoPerson } from './person';

/** A single todo item as returned by the API. */
export interface Todo {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  due_date: string | null;
  /** Whether the todo is pinned to the Today focus list. */
  is_today: boolean;
  area_id: number | null;
  /** Deep-link to a source document (e.g. Obsidian URI). */
  reference_url: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  /** Inline @tags extracted from the title by the backend. */
  tags?: string[];
  /** The todo's topic id; the backend always sends it (optional for optimistic rows). */
  topic_id?: number | null;
  /** The todo's topic, `{ id, name }`, or null. */
  topic?: TopicRef | null;
  /** The todo's people, ordered by name; optional for optimistic rows (readers treat undefined as `[]`). */
  people?: TodoPerson[];
}

/**
 * Extended todo with server-rendered HTML and cross-reference data.
 * Returned when the `html=true` query parameter is set.
 */
export interface TodoWithHtml extends Todo {
  title_html: string;
  description_html: string;
  /** Bidirectional links between todos (e.g. `#123` references in text). */
  cross_references: {
    incoming: Array<{ id: number; title: string }>;
    outgoing: Array<{ id: number; title: string }>;
  };
  /** Metadata about which todo IDs were referenced and which were broken/missing. */
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

/** A user-defined tag with usage statistics. */
export interface Tag {
  id: number;
  name: string;
  usage_count: number;
  created_at: string;
  last_used: string;
}

/**
 * Standard API envelope wrapping all successful responses.
 * @template T - The shape of the `data` payload.
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
  /** Indicates the response contains server-rendered HTML fields. */
  html_processed?: boolean;
}

/** Structured data returned by the `GET /todos/today` endpoint. */
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
    /** True when overdue items exist, triggering the attention banner. */
    needs_attention: boolean;
  };
}

// Area-related types moved to types/area.ts

/** Query parameters accepted by `GET /todos`. All fields are optional. */
export interface TodoFilters {
  /** Open only (false), done only (true), or both ('all'). */
  completed?: boolean | 'all';
  tags?: string[];
  /** Whether multiple tags must all match ('AND') or any match ('OR'). */
  tag_mode?: 'AND' | 'OR';
  due_date_from?: string;
  due_date_to?: string;
  search?: string;
  sort_by?: 'created_at' | 'updated_at' | 'due_date' | 'completed_at' | 'relevance';
  sort_order?: 'ASC' | 'DESC';
  limit?: number;
  /** Request server-rendered HTML fields in the response. */
  html?: boolean;
  area_id?: number;
  area_name?: string;
  /** When true, returns todos from all areas regardless of area_id. */
  include_all_areas?: boolean;
  /** Only todos in this topic (no area filter is applied unless area_id is also sent). */
  topic_id?: number;
  /** Only todos tagged with this person (no area filter is applied unless area_id is also sent). */
  person_id?: number;
}

/** Request body for `POST /todos`. */
export interface CreateTodoRequest {
  title: string;
  description?: string;
  due_date?: string;
  is_today?: boolean;
  area_id?: number | null;
  /** Positive id to assign, null to unassign. Always send area_id with it. */
  topic_id?: number | null;
  reference_url?: string;
  /** The full set of people to tag; `[]` clears. */
  people?: PersonIdRef[];
}

/** Request body for `PUT /todos/:id`. All fields are optional (partial update). */
export interface UpdateTodoRequest {
  title?: string;
  description?: string;
  completed?: boolean;
  due_date?: string;
  is_today?: boolean;
  area_id?: number | null;
  /** Positive id to assign, null to unassign. Always send area_id with it. */
  topic_id?: number | null;
  reference_url?: string;
  /** Replaces the todo's people when present; omit to leave them alone. */
  people?: PersonIdRef[];
}
