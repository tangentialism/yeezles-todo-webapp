import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '../../services/apiError';
import * as AreaContextModule from '../../contexts/AreaContext';
import { areaContextValue, makeArea } from '../../test/topicFactories';
import { makePerson, makeTodoPerson } from '../../test/personFactories';
import type { Todo } from '../../types/todo';

const api = vi.hoisted(() => ({
  getPeople: vi.fn(),
  createPerson: vi.fn(),
  getTopics: vi.fn(),
  categorizeTodo: vi.fn(),
  createTodo: vi.fn(),
  updateTodo: vi.fn(),
  getTodos: vi.fn(),
}));
const toast = vi.hoisted(() => ({ showToast: vi.fn(), hideToast: vi.fn() }));
vi.mock('../../contexts/AreaContext');
vi.mock('../../hooks/useApi', () => ({ useApi: () => api }));
vi.mock('../../hooks/useCrossTabSync', () => ({ useCrossTabSync: () => ({ broadcast: vi.fn() }) }));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => toast }));
vi.mock('../../hooks/useIsPhone', () => ({ useIsPhone: () => false }));
vi.mock('../../utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

import AddTodoModal from '../AddTodoModal';
import EditTodoModal from '../EditTodoModal';

const home = makeArea({ id: 1, name: 'Home' });
const ana = makePerson({ id: 4, display_name: 'Ana Ortiz' });
const ben = makePerson({ id: 9, display_name: 'Ben Okafor' });

const baseTodo: Todo = {
  id: 5, title: 'Order tiles', description: '', completed: false, due_date: null, is_today: false,
  area_id: 1, reference_url: null, created_at: '', updated_at: '', completed_at: null,
  topic_id: null, topic: null,
};

const renderWithClient = (ui: React.ReactElement) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      {ui}
    </QueryClientProvider>
  );

/** Types into the People combobox and picks the named match. */
const pickPerson = async (query: string, name: string) => {
  await userEvent.type(screen.getByRole('combobox', { name: /People/ }), query);
  await userEvent.click(await screen.findByRole('option', { name }));
};

const AddHarness = () => {
  const [open, setOpen] = useState(true);
  return <AddTodoModal isOpen={open} onClose={() => setOpen(false)} onTodoAdded={vi.fn()} />;
};

describe('todo forms: People field', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AreaContextModule, 'useArea').mockReturnValue(areaContextValue({ areas: [home], currentArea: home }));
    api.getTopics.mockResolvedValue([]);
    api.getPeople.mockResolvedValue([ana, ben]);
    api.getTodos.mockResolvedValue({ success: true, data: [] });
    api.createTodo.mockResolvedValue({ success: true, data: { ...baseTodo, id: 10 } });
    api.updateTodo.mockResolvedValue({ success: true, data: baseTodo });
  });

  it('add: two chosen people are sent as person_id refs in order', async () => {
    renderWithClient(<AddHarness />);
    await userEvent.type(screen.getByLabelText('Title'), 'Call them');
    await userEvent.click(screen.getByRole('radio', { name: 'Home' }));
    await pickPerson('Ana', 'Ana Ortiz');
    await pickPerson('Ben', 'Ben Okafor');
    await userEvent.click(screen.getByRole('button', { name: /Add todo/ }));
    await waitFor(() => expect(api.createTodo).toHaveBeenCalled());
    expect(api.createTodo.mock.calls[0][0].people).toEqual([{ person_id: 4 }, { person_id: 9 }]);
  });

  it('add: no people chosen sends no people key', async () => {
    renderWithClient(<AddHarness />);
    await userEvent.type(screen.getByLabelText('Title'), 'Plain');
    await userEvent.click(screen.getByRole('radio', { name: 'Home' }));
    await userEvent.click(screen.getByRole('button', { name: /Add todo/ }));
    await waitFor(() => expect(api.createTodo).toHaveBeenCalled());
    expect(api.createTodo.mock.calls[0][0]).not.toHaveProperty('people');
  });

  it('add: a PERSON_NOT_FOUND from create shows the store toast and keeps the form', async () => {
    api.createTodo.mockRejectedValue(new ApiError(404, 'PERSON_NOT_FOUND', 'Person 4 not found'));
    renderWithClient(<AddHarness />);
    await userEvent.type(screen.getByLabelText('Title'), 'Call them');
    await userEvent.click(screen.getByRole('radio', { name: 'Home' }));
    await pickPerson('Ana', 'Ana Ortiz');
    await userEvent.click(screen.getByRole('button', { name: /Add todo/ }));
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', message: expect.stringContaining('Person 4 not found') })
      )
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Call them');
    expect(screen.getByRole('button', { name: 'Remove Ana Ortiz' })).toBeInTheDocument();
  });

  it('edit: opens with the todo\'s people as chips; removing one sends the rest', async () => {
    const todo = { ...baseTodo, people: [makeTodoPerson({ id: 4, display_name: 'Ana Ortiz' }), makeTodoPerson({ id: 9, display_name: 'Ben Okafor' })] };
    renderWithClient(<EditTodoModal todo={todo} isOpen onClose={vi.fn()} onTodoUpdated={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Remove Ana Ortiz' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Ben Okafor' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove Ana Ortiz' }));
    await userEvent.click(screen.getByRole('button', { name: /Save/ }));
    await waitFor(() => expect(api.updateTodo).toHaveBeenCalled());
    expect(api.updateTodo.mock.calls[0][1].people).toEqual([{ person_id: 9 }]);
  });

  it('edit: removing all people sends people: []', async () => {
    const todo = { ...baseTodo, people: [makeTodoPerson({ id: 4, display_name: 'Ana Ortiz' })] };
    renderWithClient(<EditTodoModal todo={todo} isOpen onClose={vi.fn()} onTodoUpdated={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Ana Ortiz' }));
    await userEvent.click(screen.getByRole('button', { name: /Save/ }));
    await waitFor(() => expect(api.updateTodo).toHaveBeenCalled());
    expect(api.updateTodo.mock.calls[0][1].people).toEqual([]);
  });

  it('edit: an untouched save (only the title changed) sends no people key', async () => {
    const todo = { ...baseTodo, people: [makeTodoPerson({ id: 4, display_name: 'Ana Ortiz' })] };
    renderWithClient(<EditTodoModal todo={todo} isOpen onClose={vi.fn()} onTodoUpdated={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Title'), ' now');
    await userEvent.click(screen.getByRole('button', { name: /Save/ }));
    await waitFor(() => expect(api.updateTodo).toHaveBeenCalled());
    expect(api.updateTodo.mock.calls[0][1].title).toBe('Order tiles now');
    expect(api.updateTodo.mock.calls[0][1]).not.toHaveProperty('people');
  });

  it('edit: a todo with no known people (undefined) saves with no people key', async () => {
    renderWithClient(<EditTodoModal todo={baseTodo} isOpen onClose={vi.fn()} onTodoUpdated={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Save/ }));
    await waitFor(() => expect(api.updateTodo).toHaveBeenCalled());
    expect(api.updateTodo.mock.calls[0][1]).not.toHaveProperty('people');
  });

  it('edit: removing then re-adding the same person is not a change', async () => {
    const todo = { ...baseTodo, people: [makeTodoPerson({ id: 4, display_name: 'Ana Ortiz' }), makeTodoPerson({ id: 9, display_name: 'Ben Okafor' })] };
    renderWithClient(<EditTodoModal todo={todo} isOpen onClose={vi.fn()} onTodoUpdated={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Ana Ortiz' }));
    await pickPerson('Ana', 'Ana Ortiz');
    expect(within(screen.getByRole('dialog')).getAllByRole('button', { name: /^Remove / })).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: /Save/ }));
    await waitFor(() => expect(api.updateTodo).toHaveBeenCalled());
    // Order differs (Ben, Ana) but the set is the same
    expect(api.updateTodo.mock.calls[0][1]).not.toHaveProperty('people');
  });
});
