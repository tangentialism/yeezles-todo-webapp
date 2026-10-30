import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchPalette from '../SearchPalette';
import * as AreaContextModule from '../../../contexts/AreaContext';
import * as TodoStore from '../../../hooks/useTodoStore';
import * as SearchHook from '../../../hooks/useTodoSearch';
import { areaContextValue, makeArea } from '../../../test/topicFactories';
import { makeTodoPerson } from '../../../test/personFactories';
import type { Todo } from '../../../types/todo';

vi.mock('../../../contexts/AreaContext');
vi.mock('../../../hooks/useTodoStore');
vi.mock('../../../hooks/useTodoSearch');
vi.mock('../../EditTodoModal', async () => {
  const { default: Dialog } = await import('../../ui/Dialog');
  return {
    default: ({ todo, isOpen, onClose }: { todo: Todo | null; isOpen: boolean; onClose: () => void }) =>
      isOpen && todo ? (
        <Dialog title="Edit" onClose={onClose}>
          <div data-testid="edit-stub">
            <span>{todo.title}</span>
            <button onClick={onClose}>close-edit</button>
          </div>
        </Dialog>
      ) : null,
  };
});

const work = makeArea({ id: 2, name: 'Work', color: '#1E88E5' });
const home = makeArea({ id: 1, name: 'Home' });

const todo = (id: number, title: string, extra: Partial<Todo> = {}): Todo => ({
  id, title, description: '', completed: false, due_date: null, is_today: false, area_id: 2,
  reference_url: null, created_at: '', updated_at: '', completed_at: null, people: [], topic: null, ...extra,
});

const budget = todo(1, 'Draft Q1 budget', {
  topic: { id: 9, name: 'Finance' },
  people: [makeTodoPerson({ id: 5, display_name: 'Sarah Chen' })],
});
const sync = todo(2, 'Budget sync');
const deck = todo(3, 'Budget deck', { completed: true });
const all = [budget, sync, deck];

const toggleTodoCompletion = vi.fn();
const refetch = vi.fn();

const mockSearch = (results: Todo[], extra: Record<string, unknown> = {}) =>
  vi.mocked(SearchHook.useTodoSearch).mockReturnValue({
    results, query: 'budget', isFetching: false, error: null, refetch, ...extra,
  } as ReturnType<typeof SearchHook.useTodoSearch>);

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(AreaContextModule, 'useArea').mockReturnValue(areaContextValue({ areas: [home, work] }));
  vi.mocked(TodoStore.useTodoStore).mockReturnValue(
    { toggleTodoCompletion } as unknown as ReturnType<typeof TodoStore.useTodoStore>
  );
  mockSearch(all);
});

const options = () => screen.getAllByRole('option');

describe('SearchPalette', () => {
  it('focuses the input on mount', () => {
    render(<SearchPalette onClose={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: 'Search todos' })).toHaveFocus();
  });

  it('renders rows in order with done styling and meta', () => {
    render(<SearchPalette onClose={vi.fn()} />);
    const rows = options();
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('Draft Q1 budget');
    expect(rows[1]).toHaveTextContent('Budget sync');
    expect(rows[2]).toHaveTextContent('Budget deck');
    expect(within(rows[2]).getByRole('button', { name: 'Mark not done' })).toBeInTheDocument();
    expect(rows[2].querySelector('.line-through')).toHaveTextContent('Budget deck');
    expect(rows[0].querySelector('.line-through')).toBeNull();
    expect(within(rows[0]).getByRole('button', { name: 'Mark done' })).toBeInTheDocument();
    expect(within(rows[0]).getByText('Work')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Finance')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Sarah Chen')).toBeInTheDocument();
  });

  it('wraps matched text in mark', () => {
    render(<SearchPalette onClose={vi.fn()} />);
    const marks = options()[0].querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0]).toHaveTextContent('budget');
  });

  it('moves the selection with arrow keys and stops at the top', async () => {
    const user = userEvent.setup();
    render(<SearchPalette onClose={vi.fn()} />);
    expect(options()[0]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowDown}');
    expect(options()[1]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-activedescendant', options()[1].id);
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(options()[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('Enter opens the edit dialog for the selected todo', async () => {
    const user = userEvent.setup();
    render(<SearchPalette onClose={vi.fn()} />);
    await user.keyboard('{ArrowDown}{Enter}');
    expect(within(screen.getByTestId('edit-stub')).getByText('Budget sync')).toBeInTheDocument();
  });

  it.each(['Meta', 'Control'])('%s+Enter toggles the selected todo in place and back', async (mod) => {
    const user = userEvent.setup();
    render(<SearchPalette onClose={vi.fn()} />);
    await user.keyboard(`{ArrowDown}{${mod}>}{Enter}{/${mod}}`);
    expect(toggleTodoCompletion).toHaveBeenCalledWith(sync);
    expect(within(options()[1]).getByRole('button', { name: 'Mark not done' })).toBeInTheDocument();
    expect(options()[1]).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByTestId('edit-stub')).toBeNull();
    await user.keyboard(`{${mod}>}{Enter}{/${mod}}`);
    expect(toggleTodoCompletion).toHaveBeenLastCalledWith(expect.objectContaining({ id: 2, completed: true }));
    expect(within(options()[1]).getByRole('button', { name: 'Mark done' })).toBeInTheDocument();
  });

  it('clicking a row opens the editor; clicking a checkbox only toggles', async () => {
    const user = userEvent.setup();
    render(<SearchPalette onClose={vi.fn()} />);
    await user.click(within(options()[0]).getByRole('button', { name: 'Mark done' }));
    expect(toggleTodoCompletion).toHaveBeenCalledWith(budget);
    expect(screen.queryByTestId('edit-stub')).toBeNull();
    await user.click(options()[1]);
    expect(within(screen.getByTestId('edit-stub')).getByText('Budget sync')).toBeInTheDocument();
  });

  it('closing the editor refetches and keeps the query and clears overrides', async () => {
    const user = userEvent.setup();
    render(<SearchPalette onClose={vi.fn()} />);
    const input = screen.getByRole('combobox');
    await user.type(input, 'budget');
    await user.keyboard('{Meta>}{Enter}{/Meta}');
    expect(within(options()[0]).getByRole('button', { name: 'Mark not done' })).toBeInTheDocument();
    await user.keyboard('{Enter}');
    await user.click(screen.getByText('close-edit'));
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('edit-stub')).toBeNull();
    expect(input).toHaveValue('budget');
    expect(within(options()[0]).getByRole('button', { name: 'Mark done' })).toBeInTheDocument();
  });

  it('Escape closes the palette when no edit dialog is open', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SearchPalette onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape closes only the edit dialog when it is open, then the palette', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SearchPalette onClose={onClose} />);
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('edit-stub')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('edit-stub')).toBeNull();
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores keys while an IME composition is in progress', () => {
    render(<SearchPalette onClose={vi.fn()} />);
    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(input, { key: 'ArrowDown', isComposing: true });
    expect(screen.queryByTestId('edit-stub')).toBeNull();
    expect(options()[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('edit-stub')).toBeInTheDocument();
  });

  it('hover selects only when the pointer actually moved', () => {
    render(<SearchPalette onClose={vi.fn()} />);
    fireEvent.mouseMove(options()[1], { clientX: 10, clientY: 10 });
    expect(options()[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });
    expect(options()[2]).toHaveAttribute('aria-selected', 'true');
    // Synthetic mousemove from scrolling: same coordinates, must not steal selection.
    fireEvent.mouseMove(options()[1], { clientX: 10, clientY: 10 });
    expect(options()[2]).toHaveAttribute('aria-selected', 'true');
    fireEvent.mouseMove(options()[1], { clientX: 12, clientY: 10 });
    expect(options()[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps the selection when the same ids come back, resets when they change', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<SearchPalette onClose={vi.fn()} />);
    await user.keyboard('{ArrowDown}{ArrowDown}');
    mockSearch([{ ...budget }, { ...sync }, { ...deck }]);
    rerender(<SearchPalette onClose={vi.fn()} />);
    expect(options()[2]).toHaveAttribute('aria-selected', 'true');
    mockSearch([sync]);
    rerender(<SearchPalette onClose={vi.fn()} />);
    expect(options()).toHaveLength(1);
    expect(options()[0]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Enter}');
    expect(within(screen.getByTestId('edit-stub')).getByText('Budget sync')).toBeInTheDocument();
  });

  it.each([
    ['no results', {}],
    ['loading', { isFetching: true }],
  ])('Enter and Cmd+Enter do nothing with %s', async (_n, extra) => {
    const user = userEvent.setup();
    mockSearch([], extra);
    render(<SearchPalette onClose={vi.fn()} />);
    await user.keyboard('{Enter}{Meta>}{Enter}{/Meta}{ArrowDown}{ArrowUp}');
    expect(screen.queryByTestId('edit-stub')).toBeNull();
    expect(toggleTodoCompletion).not.toHaveBeenCalled();
  });

  it('shows the hint before typing and the no-match copy after', async () => {
    const user = userEvent.setup();
    mockSearch([], { query: '' });
    render(<SearchPalette onClose={vi.fn()} />);
    expect(screen.getByText('Type to search titles, descriptions, people and topics')).toBeInTheDocument();
    mockSearch([], { query: 'zzz' });
    await user.type(screen.getByRole('combobox'), 'zzz');
    expect(screen.getByText('No todos match')).toBeInTheDocument();
    expect(screen.queryByText('Type to search titles, descriptions, people and topics')).toBeNull();
  });

  it('shows an inline message when the search fails', () => {
    mockSearch([], { error: new Error('boom') });
    render(<SearchPalette onClose={vi.fn()} />);
    expect(screen.getByText('Search failed')).toBeInTheDocument();
  });

  it('lists the keys in the footer and the hint on the selected row', () => {
    render(<SearchPalette onClose={vi.fn()} />);
    expect(screen.getByText('↑↓ move · ↵ edit · ⌘↵ mark done · Esc close')).toBeInTheDocument();
    expect(within(options()[0]).getByText('⌘↵ Done')).toBeInTheDocument();
    expect(within(options()[1]).queryByText('⌘↵ Done')).toBeNull();
  });
});
