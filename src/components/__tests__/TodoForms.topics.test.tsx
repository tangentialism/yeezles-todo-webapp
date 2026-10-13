import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AddTodoModal from '../AddTodoModal';
import EditTodoModal from '../EditTodoModal';
import CreateTodoFromExternal from '../CreateTodoFromExternal';
import * as AreaContextModule from '../../contexts/AreaContext';
import * as TodoStore from '../../hooks/useTodoStore';
import * as TopicStore from '../../hooks/useTopicStore';
import { areaContextValue, makeArea, makeTopic } from '../../test/topicFactories';
import type { Todo } from '../../types/todo';

vi.mock('../../contexts/AreaContext');
vi.mock('../../hooks/useTodoStore');
vi.mock('../../hooks/useTopicStore');
const categorizeTodo = vi.fn();
vi.mock('../../hooks/useApi', () => ({ useApi: () => ({ categorizeTodo }) }));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn(), hideToast: vi.fn() }) }));

const home = makeArea({ id: 1, name: 'Home' });
const work = makeArea({ id: 2, name: 'Work' });
const createTodo = vi.fn();
const updateTodo = vi.fn();
const createTopic = vi.fn();

let topics: ReturnType<typeof makeTopic>[] = [];

const baseTodo: Todo = {
  id: 5, title: 'Order tiles', description: '', completed: false, due_date: null, is_today: false,
  area_id: 1, reference_url: null, created_at: '', updated_at: '', completed_at: null,
  topic_id: 2, topic: { id: 2, name: 'Kitchen reno' },
};

describe('todo forms: topic picker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AreaContextModule, 'useArea').mockReturnValue(areaContextValue({ areas: [home, work], currentArea: home }));
    topics = [makeTopic({ id: 1, area_id: 1, name: 'Garden' }), makeTopic({ id: 2, area_id: 1, name: 'Kitchen reno' }), makeTopic({ id: 3, area_id: 2, name: 'Website' })];
    vi.mocked(TopicStore.useTopics).mockImplementation(() => ({ data: topics }) as unknown as ReturnType<typeof TopicStore.useTopics>);
    vi.mocked(TopicStore.useTopicMutations).mockReturnValue({ createTopic, isCreating: false } as unknown as ReturnType<typeof TopicStore.useTopicMutations>);
    // Creating a topic adds it to the list, as the invalidated query would
    createTopic.mockImplementation(async ({ name, area_id }: { name: string; area_id: number }) => {
      const created = makeTopic({ id: 9, area_id, name });
      topics = [...topics, created];
      return created;
    });
    createTodo.mockResolvedValue({ id: 10 });
    updateTodo.mockResolvedValue({});
    vi.mocked(TodoStore.useTodoStore).mockReturnValue({
      createTodo, updateTodo, isCreating: false, isUpdating: false,
    } as unknown as ReturnType<typeof TodoStore.useTodoStore>);
  });

  it('add: picking a topic under Auto sets its area and skips categorization', async () => {
    render(<AddTodoModal isOpen onClose={vi.fn()} onTodoAdded={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Title'), 'Fix DNS');
    await userEvent.selectOptions(screen.getByLabelText(/Topic/), 'Website');
    expect(screen.getByRole('radio', { name: 'Work' })).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: /Add todo/ }));
    expect(categorizeTodo).not.toHaveBeenCalled();
    expect(createTodo).toHaveBeenCalledWith(expect.objectContaining({ area_id: 2, topic_id: 3 }));
  });

  it('add: changing the area clears the topic with the hint', async () => {
    render(<AddTodoModal isOpen onClose={vi.fn()} onTodoAdded={vi.fn()} />);
    await userEvent.selectOptions(screen.getByLabelText(/Topic/), 'Website');
    await userEvent.click(screen.getByRole('radio', { name: 'Home' }));
    expect(screen.getByLabelText(/Topic/)).toHaveDisplayValue('None');
    expect(screen.getByText('Topic cleared: topics belong to one area.')).toBeInTheDocument();
  });

  it('add: no topic sends no topic_id', async () => {
    render(<AddTodoModal isOpen onClose={vi.fn()} onTodoAdded={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Title'), 'Plain');
    await userEvent.click(screen.getByRole('radio', { name: 'Home' }));
    await userEvent.click(screen.getByRole('button', { name: /Add todo/ }));
    expect(createTodo.mock.calls[0][0]).not.toHaveProperty('topic_id');
  });

  it('edit: loads the todo\'s topic and always sends area_id with topic_id', async () => {
    render(<EditTodoModal todo={baseTodo} isOpen onClose={vi.fn()} onTodoUpdated={vi.fn()} />);
    expect(screen.getByLabelText(/Topic/)).toHaveDisplayValue('Kitchen reno');
    await userEvent.selectOptions(screen.getByLabelText(/Topic/), 'None');
    await userEvent.click(screen.getByRole('button', { name: /Save/ }));
    expect(updateTodo).toHaveBeenCalledWith(5, expect.objectContaining({ area_id: 1, topic_id: null }));
  });

  it('edit: an archived current topic stays selected and is kept on save', async () => {
    render(<EditTodoModal todo={{ ...baseTodo, topic_id: 8, topic: { id: 8, name: 'Old shed' } }} isOpen onClose={vi.fn()} onTodoUpdated={vi.fn()} />);
    expect(screen.getByLabelText(/Topic/)).toHaveDisplayValue('Old shed (archived)');
    await userEvent.click(screen.getByRole('button', { name: /Save/ }));
    expect(updateTodo).toHaveBeenCalledWith(5, expect.objectContaining({ area_id: 1, topic_id: 8 }));
  });

  it('edit: a todo whose topic was deleted shows None', () => {
    render(<EditTodoModal todo={{ ...baseTodo, topic_id: null, topic: null }} isOpen onClose={vi.fn()} onTodoUpdated={vi.fn()} />);
    expect(screen.getByLabelText(/Topic/)).toHaveDisplayValue('None');
  });

  it('external: sends the topic and area', async () => {
    render(
      <MemoryRouter initialEntries={['/create-todo-from-external?title=Clip']}>
        <CreateTodoFromExternal />
      </MemoryRouter>
    );
    await userEvent.selectOptions(screen.getByLabelText(/Topic/), 'Garden');
    await userEvent.click(screen.getByRole('button', { name: 'Add todo' }));
    expect(createTodo).toHaveBeenCalledWith(expect.objectContaining({ area_id: 1, topic_id: 1 }));
  });

  it('add: creating a topic from New topic… selects it and does not create the todo', async () => {
    render(<AddTodoModal isOpen onClose={vi.fn()} onTodoAdded={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Title'), 'Order tiles');
    await userEvent.click(screen.getByRole('radio', { name: 'Home' }));
    await userEvent.selectOptions(screen.getByLabelText(/Topic/), 'New topic…');
    const dialog = screen.getByRole('dialog', { name: 'New topic' });
    await userEvent.type(within(dialog).getByLabelText('Name'), 'Fresh');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create topic' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New topic' })).not.toBeInTheDocument());
    expect(createTopic).toHaveBeenCalledTimes(1);
    expect(createTodo).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'New todo' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Order tiles');
    expect(screen.getByLabelText(/Topic/)).toHaveDisplayValue('Fresh');
  });

  it('add: Escape in New topic… closes only the topic dialog and keeps the typed title', async () => {
    render(<AddTodoModal isOpen onClose={vi.fn()} onTodoAdded={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Title'), 'Order tiles');
    await userEvent.selectOptions(screen.getByLabelText(/Topic/), 'New topic…');
    expect(screen.getByRole('dialog', { name: 'New topic' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'New topic' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'New todo' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Order tiles');
  });

  it('external: areas loading after a topic is picked do not overwrite the topic\'s area', async () => {
    const spy = vi.spyOn(AreaContextModule, 'useArea').mockReturnValue(areaContextValue({ areas: [home, work], currentArea: null }));
    const tree = () => (
      <MemoryRouter initialEntries={['/create-todo-from-external?title=Clip']}>
        <CreateTodoFromExternal />
      </MemoryRouter>
    );
    const { rerender } = render(tree());
    await userEvent.selectOptions(screen.getByLabelText(/Topic/), 'Website');
    expect(screen.getByRole('radio', { name: 'Work' })).toBeChecked();
    spy.mockReturnValue(areaContextValue({ areas: [home, work], currentArea: home }));
    rerender(tree());
    expect(screen.getByRole('radio', { name: 'Work' })).toBeChecked();
    expect(screen.getByLabelText(/Topic/)).toHaveDisplayValue('Website');
    await userEvent.click(screen.getByRole('button', { name: 'Add todo' }));
    expect(createTodo).toHaveBeenCalledWith(expect.objectContaining({ area_id: 2, topic_id: 3 }));
  });
});
