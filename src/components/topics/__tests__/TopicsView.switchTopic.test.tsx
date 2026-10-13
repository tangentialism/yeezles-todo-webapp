import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TopicsView from '../TopicsView';
import * as AreaContextModule from '../../../contexts/AreaContext';
import * as ToastContextModule from '../../../contexts/ToastContext';
import * as TopicStore from '../../../hooks/useTopicStore';
import * as TodoStore from '../../../hooks/useTodoStore';
import { areaContextValue, makeArea, makeTopic } from '../../../test/topicFactories';

// Real TopicsView, TopicDetail and TopicNoteEditor over mocked stores.
vi.mock('../../../contexts/AreaContext');
vi.mock('../../../contexts/ToastContext');
vi.mock('../../../hooks/useTopicStore');
vi.mock('../../../hooks/useTodoStore');
vi.mock('../../TodoActions', () => ({ default: () => null }));
vi.mock('../../TodayToggle', () => ({ default: () => null }));
vi.mock('../../EditTodoModal', () => ({ default: () => null }));

const home = makeArea({ id: 1, name: 'Home' });
const topicA = makeTopic({ id: 1, area_id: 1, name: 'Garden', status_note: 'Bulbs in.' });
const topicB = makeTopic({ id: 2, area_id: 1, name: 'Kitchen reno', status_note: 'Waiting on quote.' });
const setTopicNote = vi.fn();

describe('TopicsView: opening another topic while one is open (I5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AreaContextModule, 'useArea').mockReturnValue(areaContextValue({ areas: [home], currentArea: home }));
    vi.mocked(ToastContextModule.useToast).mockReturnValue({ showToast: vi.fn(), hideToast: vi.fn(), clearAllToasts: vi.fn() });
    vi.mocked(TopicStore.useTopics).mockReturnValue({
      data: [topicA, topicB], isLoading: false, error: null, refetch: vi.fn(), isRefetching: false,
    } as unknown as ReturnType<typeof TopicStore.useTopics>);
    // Both topics are cached, so switching never passes through a loading state
    vi.mocked(TopicStore.useTopic).mockImplementation((id) => ({
      data: id === 1 ? topicA : topicB, isLoading: false, error: null, refetch: vi.fn(),
    }) as unknown as ReturnType<typeof TopicStore.useTopic>);
    vi.mocked(TopicStore.useTopicTodos).mockReturnValue({
      data: [], isLoading: false, error: null, refetch: vi.fn(),
    } as unknown as ReturnType<typeof TopicStore.useTopicTodos>);
    vi.mocked(TopicStore.useTopicMutations).mockReturnValue({
      setTopicNote, isSavingNote: false, updateTopic: vi.fn(), deleteTopic: vi.fn(),
    } as unknown as ReturnType<typeof TopicStore.useTopicMutations>);
    vi.mocked(TodoStore.useTodoStore).mockReturnValue({
      toggleTodoCompletion: vi.fn(), getTodoDisplayState: () => ({ completed: false }),
    } as unknown as ReturnType<typeof TodoStore.useTodoStore>);
  });

  it("shows B's note, not A's unsaved draft", async () => {
    const props = { onOpenTopic: vi.fn(), onCloseTopic: vi.fn() };
    const { rerender } = render(<TopicsView {...props} openTopicId={1} />);
    const noteA = screen.getByLabelText('Status note');
    expect(noteA).toHaveValue('Bulbs in.');
    await userEvent.type(noteA, ' Draft for A.');

    rerender(<TopicsView {...props} openTopicId={2} />);

    expect(screen.getByRole('heading', { name: /Kitchen reno/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Status note')).toHaveValue('Waiting on quote.');
    expect(screen.getByRole('button', { name: 'Save note' })).toBeDisabled();
  });
});
