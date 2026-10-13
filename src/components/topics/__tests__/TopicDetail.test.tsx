import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TopicDetail from '../TopicDetail';
import * as AreaContextModule from '../../../contexts/AreaContext';
import * as ToastContextModule from '../../../contexts/ToastContext';
import * as TopicStore from '../../../hooks/useTopicStore';
import * as TodoStore from '../../../hooks/useTodoStore';
import { TopicNavigationContext } from '../../../hooks/useOpenTopic';
import { ApiError } from '../../../services/apiError';
import { areaContextValue, makeArea, makeTopic } from '../../../test/topicFactories';
import type { Todo } from '../../../types/todo';

vi.mock('../../../contexts/AreaContext');
vi.mock('../../../contexts/ToastContext');
vi.mock('../../../hooks/useTopicStore');
vi.mock('../../../hooks/useTodoStore');
vi.mock('../../TodoActions', () => ({ default: () => null }));
vi.mock('../../TodayToggle', () => ({ default: () => null }));
vi.mock('../../EditTodoModal', () => ({ default: () => null }));
vi.mock('../TopicNoteEditor', () => ({ default: () => <div>note-editor</div> }));

const home = makeArea({ id: 1, name: 'Home', color: '#43A047' });
const topic = makeTopic({ id: 4, area_id: 1, name: 'Kitchen reno', description: 'The big one', open_count: 1, done_count: 1 });
const todo = (id: number, title: string, completed: boolean): Todo => ({
  id, title, description: '', completed, due_date: null, is_today: false, area_id: 1,
  reference_url: null, created_at: '', updated_at: '', completed_at: null, topic_id: 4, topic: { id: 4, name: 'Kitchen reno' },
});
const updateTopic = vi.fn();
const deleteTopic = vi.fn();
const toggleTodoCompletion = vi.fn();
const showToast = vi.fn();

const query = <T,>(data: T) => ({ data, isLoading: false, error: null, refetch: vi.fn() });
const mockTopic = (value: ReturnType<typeof makeTopic>) =>
  vi.mocked(TopicStore.useTopic).mockReturnValue(query(value) as unknown as ReturnType<typeof TopicStore.useTopic>);
const mockTopicError = (error: Error) =>
  vi.mocked(TopicStore.useTopic).mockReturnValue({
    data: undefined, isLoading: false, error, refetch: vi.fn(),
  } as unknown as ReturnType<typeof TopicStore.useTopic>);

const openMenu = () => userEvent.click(screen.getByRole('button', { name: 'Topic actions' }));

describe('TopicDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AreaContextModule, 'useArea').mockReturnValue(areaContextValue({ areas: [home], currentArea: home }));
    vi.mocked(ToastContextModule.useToast).mockReturnValue({
      showToast, hideToast: vi.fn(), clearAllToasts: vi.fn(),
    });
    mockTopic(topic);
    vi.mocked(TopicStore.useTopicTodos).mockImplementation((_id, completed) =>
      query(completed ? [todo(2, 'Pick tiles', true)] : [todo(1, 'Order countertop', false)]) as unknown as ReturnType<typeof TopicStore.useTopicTodos>
    );
    vi.mocked(TopicStore.useTopicMutations).mockReturnValue({
      updateTopic, deleteTopic, isUpdating: false, isDeleting: false,
    } as unknown as ReturnType<typeof TopicStore.useTopicMutations>);
    vi.mocked(TodoStore.useTodoStore).mockReturnValue({
      toggleTodoCompletion,
      getTodoDisplayState: (t: Todo) => ({ completed: t.completed }),
    } as unknown as ReturnType<typeof TodoStore.useTodoStore>);
  });

  it('shows the header, description, note editor and open todos without topic chips', () => {
    // Inside the dashboard's open-topic context a chip would be a button, so
    // its absence here means showTopic={false} did its job.
    render(
      <TopicNavigationContext.Provider value={vi.fn()}>
        <TopicDetail topicId={4} onBack={vi.fn()} />
      </TopicNavigationContext.Provider>
    );
    expect(screen.getByRole('heading', { name: 'Kitchen reno' })).toBeInTheDocument();
    expect(screen.getByText('1 open · 1 done')).toBeInTheDocument();
    expect(screen.getByText('The big one')).toBeInTheDocument();
    expect(screen.getByText('note-editor')).toBeInTheDocument();
    const open = screen.getByRole('list', { name: 'Open todos' });
    expect(within(open).getByText('Order countertop')).toBeInTheDocument();
    expect(within(open).queryByText('Kitchen reno')).not.toBeInTheDocument();
    expect(within(open).queryByRole('button', { name: /Open topic/ })).not.toBeInTheDocument();
  });

  it('keeps done todos collapsed until asked', async () => {
    render(<TopicDetail topicId={4} onBack={vi.fn()} />);
    expect(screen.queryByText('Pick tiles')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Done (1)' }));
    expect(screen.getByText('Pick tiles')).toBeInTheDocument();
  });

  it('shows done todos as finished, not mid-completion (no Completing… or Undo)', async () => {
    render(
      <TopicNavigationContext.Provider value={vi.fn()}>
        <TopicDetail topicId={4} onBack={vi.fn()} />
      </TopicNavigationContext.Provider>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Done (1)' }));
    const done = screen.getByRole('list', { name: 'Done todos' });
    expect(within(done).getByText('Pick tiles')).toBeInTheDocument();
    expect(within(done).queryByText('Completing…')).not.toBeInTheDocument();
    expect(within(done).queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
    expect(within(done).queryByText('Kitchen reno')).not.toBeInTheDocument();
  });

  it('completes a todo through the todo store (which refreshes topic views)', async () => {
    render(<TopicDetail topicId={4} onBack={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Complete "Order countertop"' }));
    expect(toggleTodoCompletion).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it('archives an active topic from the menu', async () => {
    updateTopic.mockResolvedValue({});
    render(<TopicDetail topicId={4} onBack={vi.fn()} />);
    await openMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Archive' }));
    expect(updateTopic).toHaveBeenCalledWith(4, { archived: true });
    expect(showToast).not.toHaveBeenCalled();
  });

  it('unarchives an archived topic from the menu', async () => {
    updateTopic.mockResolvedValue({});
    mockTopic({ ...topic, archived: true });
    render(<TopicDetail topicId={4} onBack={vi.fn()} />);
    expect(screen.getByText('Archived')).toBeInTheDocument();
    await openMenu();
    expect(screen.queryByRole('menuitem', { name: 'Archive' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Unarchive' }));
    expect(updateTopic).toHaveBeenCalledWith(4, { archived: false });
  });

  it('shows a failed archive as an error toast', async () => {
    updateTopic.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server.'));
    render(<TopicDetail topicId={4} onBack={vi.fn()} />);
    await openMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Archive' }));
    await vi.waitFor(() =>
      expect(showToast).toHaveBeenCalledWith({ message: 'Could not archive the topic: Could not reach the server.', type: 'error' })
    );
  });

  it('warns before delete, then deletes and goes back', async () => {
    deleteTopic.mockResolvedValue(undefined);
    const onBack = vi.fn();
    render(<TopicDetail topicId={4} onBack={onBack} />);
    await openMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete…' }));
    expect(screen.getByText('Delete "Kitchen reno"? Its 2 todos stay but lose their topic.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete topic' }));
    expect(deleteTopic).toHaveBeenCalledWith(4);
    expect(onBack).toHaveBeenCalled();
  });

  it('edits the name and description', async () => {
    updateTopic.mockResolvedValue({});
    render(<TopicDetail topicId={4} onBack={vi.fn()} />);
    await openMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    const name = screen.getByLabelText('Name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Kitchen');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(updateTopic).toHaveBeenCalledWith(4, { name: 'Kitchen', description: 'The big one' });
  });

  it('goes back from the back link, and shows not-found for a deleted topic', async () => {
    const onBack = vi.fn();
    mockTopicError(new ApiError(404, 'TOPIC_NOT_FOUND', 'Topic not found'));
    render(<TopicDetail topicId={4} onBack={onBack} />);
    expect(screen.getByText('Topic not found')).toBeInTheDocument();
    expect(screen.getByText('It may have been deleted.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '← Topics' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('shows a generic load failure, not not-found, for any other error', () => {
    mockTopicError(new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server.'));
    render(<TopicDetail topicId={4} onBack={vi.fn()} />);
    expect(screen.queryByText('Topic not found')).not.toBeInTheDocument();
    expect(screen.getByText('Could not load this topic')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  });
});
