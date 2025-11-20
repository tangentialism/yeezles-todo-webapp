import { describe, it, expect } from 'vitest';
import { groupTodosByCompletionDate, formatCompletionDateGroup } from '../todoGrouping';
import type { Todo } from '../../types/todo';

describe('todoGrouping utilities', () => {
  describe('groupTodosByCompletionDate', () => {
    it('should group completed todos by completion date', () => {
      const now = new Date('2024-01-15T14:30:00Z');
      const yesterday = new Date('2024-01-14T10:00:00Z');
      const lastWeek = new Date('2024-01-08T16:00:00Z');

      const todos: Todo[] = [
        {
          id: 1,
          title: 'Todo 1',
          description: '',
          completed: true,
          completed_at: now.toISOString(),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
          due_date: null,
          is_today: false,
          tags: [],
          area_id: null,
          reference_url: null
        },
        {
          id: 2,
          title: 'Todo 2',
          description: '',
          completed: true,
          completed_at: now.toISOString(),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
          due_date: null,
          is_today: false,
          tags: [],
          area_id: null,
          reference_url: null
        },
        {
          id: 3,
          title: 'Todo 3',
          description: '',
          completed: true,
          completed_at: yesterday.toISOString(),
          created_at: yesterday.toISOString(),
          updated_at: yesterday.toISOString(),
          due_date: null,
          is_today: false,
          tags: [],
          area_id: null,
          reference_url: null
        },
        {
          id: 4,
          title: 'Todo 4',
          description: '',
          completed: true,
          completed_at: lastWeek.toISOString(),
          created_at: lastWeek.toISOString(),
          updated_at: lastWeek.toISOString(),
          due_date: null,
          is_today: false,
          tags: [],
          area_id: null,
          reference_url: null
        }
      ];

      const grouped = groupTodosByCompletionDate(todos);

      expect(Object.keys(grouped)).toHaveLength(3);
      expect(grouped['2024-01-15']).toHaveLength(2);
      expect(grouped['2024-01-14']).toHaveLength(1);
      expect(grouped['2024-01-08']).toHaveLength(1);
    });

    it('should filter out todos without completed_at date', () => {
      const todos: Todo[] = [
        {
          id: 1,
          title: 'Todo 1',
          description: '',
          completed: true,
          completed_at: '2024-01-15T14:30:00Z',
          created_at: '2024-01-15T14:30:00Z',
          updated_at: '2024-01-15T14:30:00Z',
          due_date: null,
          is_today: false,
          tags: [],
          area_id: null,
          reference_url: null
        },
        {
          id: 2,
          title: 'Todo 2',
          description: '',
          completed: true,
          completed_at: null, // No completion date
          created_at: '2024-01-15T14:30:00Z',
          updated_at: '2024-01-15T14:30:00Z',
          due_date: null,
          is_today: false,
          tags: [],
          area_id: null,
          reference_url: null
        }
      ];

      const grouped = groupTodosByCompletionDate(todos);

      expect(Object.keys(grouped)).toHaveLength(1);
      expect(grouped['2024-01-15']).toHaveLength(1);
    });

    it('should return empty object for empty array', () => {
      const grouped = groupTodosByCompletionDate([]);
      expect(grouped).toEqual({});
    });

    it('should sort groups by date descending (most recent first)', () => {
      const todos: Todo[] = [
        {
          id: 1,
          title: 'Old todo',
          description: '',
          completed: true,
          completed_at: '2024-01-01T10:00:00Z',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
          due_date: null,
          is_today: false,
          tags: [],
          area_id: null,
          reference_url: null
        },
        {
          id: 2,
          title: 'New todo',
          description: '',
          completed: true,
          completed_at: '2024-01-15T10:00:00Z',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
          due_date: null,
          is_today: false,
          tags: [],
          area_id: null,
          reference_url: null
        }
      ];

      const grouped = groupTodosByCompletionDate(todos);
      const dates = Object.keys(grouped);

      expect(dates[0]).toBe('2024-01-15');
      expect(dates[1]).toBe('2024-01-01');
    });
  });

  describe('formatCompletionDateGroup', () => {
    const mockNow = new Date('2024-01-15T14:30:00Z');

    it('should return "Today" for today\'s date', () => {
      const todayStr = '2024-01-15';
      expect(formatCompletionDateGroup(todayStr, mockNow)).toBe('Today');
    });

    it('should return "Yesterday" for yesterday\'s date', () => {
      const yesterdayStr = '2024-01-14';
      expect(formatCompletionDateGroup(yesterdayStr, mockNow)).toBe('Yesterday');
    });

    it('should return day name for dates within the last week', () => {
      const lastWeekStr = '2024-01-12'; // 3 days ago (Friday if today is Monday)
      const result = formatCompletionDateGroup(lastWeekStr, mockNow);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      // Should be a day name like "Friday", "Thursday", etc.
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      expect(dayNames).toContain(result);
    });

    it('should return formatted date for dates older than a week', () => {
      const oldDateStr = '2024-01-01';
      const result = formatCompletionDateGroup(oldDateStr, mockNow);
      expect(result).toBe('Jan 1, 2024');
    });

    it('should handle edge case of exactly 7 days ago', () => {
      const sevenDaysAgoStr = '2024-01-08';
      const result = formatCompletionDateGroup(sevenDaysAgoStr, mockNow);
      // Should return day name since it's within 7 days
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      expect(dayNames).toContain(result);
    });
  });
});

