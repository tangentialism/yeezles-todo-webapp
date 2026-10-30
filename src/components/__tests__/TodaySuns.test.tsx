import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AddTodoModal from '../AddTodoModal';
import EditTodoModal from '../EditTodoModal';
import CreateMultipleTodos from '../CreateMultipleTodos';
import CreateTodoFromExternal from '../CreateTodoFromExternal';
import TodoActions from '../TodoActions';
import * as AreaContextModule from '../../contexts/AreaContext';
import * as TodoStore from '../../hooks/useTodoStore';
import * as TopicStore from '../../hooks/useTopicStore';
import { areaContextValue, makeArea } from '../../test/topicFactories';
import type { Todo } from '../../types/todo';

// Spec §4: a sun attached to a todo that is (or is set to go) in Today is orange;
// an abstract sun or an action not yet taken stays blue (or faint where it was).

vi.mock('../../contexts/AreaContext');
vi.mock('../../hooks/useTodoStore');
vi.mock('../../hooks/useTopicStore');
vi.mock('../../hooks/usePeopleStore', () => ({ usePeople: () => ({ data: [] }), usePeopleMutations: () => ({ createPerson: vi.fn(), isCreating: false }) }));
vi.mock('../../hooks/useApi', () => ({ useApi: () => ({ categorizeTodo: vi.fn() }) }));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn(), hideToast: vi.fn() }) }));

const home = makeArea({ id: 1, name: 'Home' });

const baseTodo: Todo = {
  id: 5, title: 'Order tiles', description: '', completed: false, due_date: null, is_today: false,
  area_id: 1, reference_url: null, created_at: '', updated_at: '', completed_at: null,
};

/** The sun icon in an "Add to Today" switch row. */
const switchSun = () => screen.getByText('Add to Today').closest('label')!.querySelector('svg')!;

/** The sun icon in a row-menu item, after opening the menu. */
const menuSun = async (name: string) => {
  await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
  return screen.getByRole('menuitem', { name }).querySelector('svg')!;
};

describe('Today suns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AreaContextModule, 'useArea').mockReturnValue(areaContextValue({ areas: [home], currentArea: home }));
    vi.mocked(TopicStore.useTopics).mockReturnValue({ data: [] } as unknown as ReturnType<typeof TopicStore.useTopics>);
    vi.mocked(TopicStore.useTopicMutations).mockReturnValue({ createTopic: vi.fn(), isCreating: false } as unknown as ReturnType<typeof TopicStore.useTopicMutations>);
    vi.mocked(TodoStore.useTodoStore).mockReturnValue({
      createTodo: vi.fn(), updateTodo: vi.fn(), deleteTodo: vi.fn(), toggleTodoCompletion: vi.fn(),
      moveToToday: vi.fn(), removeFromToday: vi.fn(),
      isCreating: false, isUpdating: false, isDeleting: false, isMovingToToday: false, isRemovingFromToday: false,
    } as unknown as ReturnType<typeof TodoStore.useTodoStore>);
  });

  it('menu: Remove from Today sun is orange', async () => {
    render(<TodoActions todo={{ ...baseTodo, is_today: true }} onEdit={vi.fn()} onUpdate={vi.fn()} />);
    const sun = await menuSun('Remove from Today');
    expect(sun).toHaveClass('text-today');
    expect(sun).not.toHaveClass('text-accent');
  });

  it('menu: Add to Today sun stays blue', async () => {
    render(<TodoActions todo={baseTodo} onEdit={vi.fn()} onUpdate={vi.fn()} />);
    const sun = await menuSun('Add to Today');
    expect(sun).toHaveClass('text-accent');
    expect(sun).not.toHaveClass('text-today');
  });

  it('add modal: sun is blue when off, orange when switched on', async () => {
    render(<AddTodoModal isOpen onClose={vi.fn()} onTodoAdded={vi.fn()} />);
    expect(switchSun()).toHaveClass('text-accent');
    expect(switchSun()).not.toHaveClass('text-today');
    await userEvent.click(screen.getByLabelText('Add to Today'));
    expect(switchSun()).toHaveClass('text-today');
    expect(switchSun()).not.toHaveClass('text-accent');
  });

  it('edit modal: opened on a todo in Today, sun is orange on first render', () => {
    render(<EditTodoModal todo={{ ...baseTodo, is_today: true }} isOpen onClose={vi.fn()} onTodoUpdated={vi.fn()} />);
    expect(switchSun()).toHaveClass('text-today');
    expect(switchSun()).not.toHaveClass('text-accent');
  });

  it('edit modal: sun is blue when off', () => {
    render(<EditTodoModal todo={baseTodo} isOpen onClose={vi.fn()} onTodoUpdated={vi.fn()} />);
    expect(switchSun()).toHaveClass('text-accent');
    expect(switchSun()).not.toHaveClass('text-today');
  });

  it('bulk create: sun is faint when off, orange when switched on', async () => {
    const todos = encodeURIComponent(JSON.stringify([{ title: 'Call plumber' }]));
    render(
      <MemoryRouter initialEntries={[`/create-multiple-todos?todos=${todos}`]}>
        <CreateMultipleTodos />
      </MemoryRouter>
    );
    expect(switchSun()).toHaveClass('text-ink-faint');
    await userEvent.click(screen.getByLabelText('Add to Today'));
    expect(switchSun()).toHaveClass('text-today');
    expect(switchSun()).not.toHaveClass('text-accent');
  });

  it('external create: sun is faint when off, orange when switched on', async () => {
    render(
      <MemoryRouter initialEntries={['/create-todo-from-external?title=Clip']}>
        <CreateTodoFromExternal />
      </MemoryRouter>
    );
    expect(switchSun()).toHaveClass('text-ink-faint');
    await userEvent.click(screen.getByLabelText('Add to Today'));
    expect(switchSun()).toHaveClass('text-today');
    expect(switchSun()).not.toHaveClass('text-accent');
  });
});
