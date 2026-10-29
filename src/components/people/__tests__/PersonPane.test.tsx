import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PersonPane from '../PersonPane';
import * as AreaContextModule from '../../../contexts/AreaContext';
import * as PeopleStore from '../../../hooks/usePeopleStore';
import * as TodoStore from '../../../hooks/useTodoStore';
import { PersonNavigationContext } from '../../../hooks/useOpenPerson';
import { ApiError } from '../../../services/apiError';
import { areaContextValue, makeArea } from '../../../test/topicFactories';
import { makePerson, makeTodoPerson } from '../../../test/personFactories';
import type { Todo } from '../../../types/todo';

vi.mock('../../../contexts/AreaContext');
vi.mock('../../../hooks/usePeopleStore');
vi.mock('../../../hooks/useTodoStore');
vi.mock('../../TodoActions', () => ({ default: () => null }));
vi.mock('../../TodayToggle', () => ({ default: () => null }));
vi.mock('../../EditTodoModal', () => ({ default: () => null }));

const home = makeArea({ id: 1, name: 'Home' });
const work = makeArea({ id: 2, name: 'Work', color: '#1E88E5' });
const priya = makePerson({ id: 1, display_name: 'Priya Raman', aliases: ['PR'], open_count: 3, done_count: 1 });
const lee = makeTodoPerson({ id: 5, display_name: 'Lee Other' });
const me = makeTodoPerson({ id: 1, display_name: 'Priya Raman' });

const todo = (id: number, title: string, area_id: number | null, completed = false, people = [me]): Todo => ({
  id, title, description: '', completed, due_date: null, is_today: false, area_id,
  reference_url: null, created_at: '', updated_at: '', completed_at: completed ? '2026-10-20T12:00:00.000Z' : null, people,
});

const query = <T,>(data: T) => ({ data, isLoading: false, error: null, refetch: vi.fn() });
const asReturn = <T,>(value: unknown) => value as T;
const toggleTodoCompletion = vi.fn();

const mockTodos = (open: Todo[], done: Todo[]) =>
  vi.mocked(PeopleStore.usePersonTodos).mockImplementation((_id, completed, enabled = true) =>
    asReturn<ReturnType<typeof PeopleStore.usePersonTodos>>(
      completed ? query(enabled ? done : undefined) : query(open)
    )
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(AreaContextModule, 'useArea').mockReturnValue(areaContextValue({ areas: [home, work], currentArea: null }));
  vi.mocked(PeopleStore.usePerson).mockReturnValue(asReturn<ReturnType<typeof PeopleStore.usePerson>>(query(priya)));
  mockTodos([], []);
  vi.mocked(TodoStore.useTodoStore).mockReturnValue(
    asReturn<ReturnType<typeof TodoStore.useTodoStore>>({
      toggleTodoCompletion,
      getTodoDisplayState: (t: Todo) => ({ completed: t.completed }),
    })
  );
});

const renderPane = (onBack = vi.fn()) =>
  render(
    <PersonNavigationContext.Provider value={vi.fn()}>
      <PersonPane personId={1} onBack={onBack} />
    </PersonNavigationContext.Provider>
  );

describe('PersonPane', () => {
  it('shows the name, aliases and counts', () => {
    renderPane();
    expect(screen.getByRole('heading', { name: 'Priya Raman' })).toBeInTheDocument();
    expect(screen.getByText('PR')).toBeInTheDocument();
    expect(screen.getByText('3 open · 1 done')).toBeInTheDocument();
  });

  it('groups open todos by area, with a no-area group last, hiding the person own chip only', () => {
    mockTodos([todo(1, 'Home task', 1, false, [me, lee]), todo(2, 'Work task', 2), todo(3, 'Loose task', null)], []);
    renderPane();
    const groups = screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'));
    expect(groups).toEqual(['Home', 'Work', 'No area']);
    expect(screen.getByRole('button', { name: 'Open person Lee Other' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open person Priya Raman' })).not.toBeInTheDocument();
  });

  it('keeps Show completed off and the done query disabled until switched on', async () => {
    mockTodos([todo(1, 'Open one', 1)], [todo(9, 'Finished thing', 1, true)]);
    renderPane();
    const toggle = screen.getByRole('checkbox', { name: 'Show completed' });
    expect(toggle).not.toBeChecked();
    expect(vi.mocked(PeopleStore.usePersonTodos)).toHaveBeenCalledWith(1, true, false);
    expect(vi.mocked(PeopleStore.usePersonTodos)).not.toHaveBeenCalledWith(1, true, true);
    expect(screen.queryByText('Finished thing')).not.toBeInTheDocument();
    await userEvent.click(toggle);
    expect(vi.mocked(PeopleStore.usePersonTodos)).toHaveBeenCalledWith(1, true, true);
    const done = screen.getByRole('list', { name: 'Done todos' });
    expect(within(done).getByText('Finished thing')).toBeInTheDocument();
    expect(within(done).queryByText('Completing…')).not.toBeInTheDocument();
  });

  it('says Nothing tagged when there are no todos', () => {
    vi.mocked(PeopleStore.usePerson).mockReturnValue(
      asReturn<ReturnType<typeof PeopleStore.usePerson>>(query({ ...priya, open_count: 0, done_count: 0 }))
    );
    renderPane();
    expect(screen.getByText('Nothing tagged.')).toBeInTheDocument();
  });

  it('shows the not-found copy and keeps the back control', async () => {
    const onBack = vi.fn();
    vi.mocked(PeopleStore.usePerson).mockReturnValue(
      asReturn<ReturnType<typeof PeopleStore.usePerson>>({
        data: undefined, isLoading: false, error: new ApiError(404, 'PERSON_NOT_FOUND', 'nope'), refetch: vi.fn(),
      })
    );
    renderPane(onBack);
    expect(screen.getByText('Person not found. They may have been deleted or merged.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '← People' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('shows retry for other errors and keeps the back control', async () => {
    const refetch = vi.fn();
    vi.mocked(PeopleStore.usePerson).mockReturnValue(
      asReturn<ReturnType<typeof PeopleStore.usePerson>>({ data: undefined, isLoading: false, error: new Error('boom'), refetch })
    );
    renderPane();
    expect(screen.getByRole('button', { name: '← People' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('completes a row through the store; after the refetch it moves under Show completed and counts change', async () => {
    const t = todo(1, 'Order tiles', 1);
    mockTodos([t], []);
    const { rerender } = renderPane();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Show completed' }));
    await userEvent.click(screen.getByRole('button', { name: 'Complete "Order tiles"' }));
    expect(toggleTodoCompletion).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));

    // The store's invalidation refetches both queries and the person counts.
    mockTodos([], [{ ...t, completed: true, completed_at: '2026-10-29T12:00:00.000Z' }]);
    vi.mocked(PeopleStore.usePerson).mockReturnValue(
      asReturn<ReturnType<typeof PeopleStore.usePerson>>(query({ ...priya, open_count: 2, done_count: 2 }))
    );
    rerender(
      <PersonNavigationContext.Provider value={vi.fn()}>
        <PersonPane personId={1} onBack={vi.fn()} />
      </PersonNavigationContext.Provider>
    );
    expect(screen.queryByRole('button', { name: 'Complete "Order tiles"' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Done todos' })).getByText('Order tiles')).toBeInTheDocument();
    expect(screen.getByText('2 open · 2 done')).toBeInTheDocument();
  });
});
