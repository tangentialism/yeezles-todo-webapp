import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TopicsView from '../TopicsView';
import * as AreaContextModule from '../../../contexts/AreaContext';
import * as TopicStore from '../../../hooks/useTopicStore';
import { areaContextValue, makeArea, makeTopic } from '../../../test/topicFactories';

vi.mock('../../../contexts/AreaContext');
vi.mock('../../../hooks/useTopicStore');
vi.mock('../TopicDetail', () => ({
  default: ({ topicId, onBack }: { topicId: number; onBack: () => void }) => (
    <div>
      detail-{topicId}
      <button type="button" onClick={onBack}>
        ← Topics
      </button>
    </div>
  ),
}));
vi.mock('../NewTopicDialog', () => ({
  default: ({ defaultAreaId }: { defaultAreaId: number | null }) => <div>new-topic-dialog area={String(defaultAreaId)}</div>,
}));
vi.mock('../ProposalBanner', () => ({ default: () => <div>proposal-banner</div> }));

const home = makeArea({ id: 1, name: 'Home', color: '#43A047' });
const work = makeArea({ id: 2, name: 'Work', color: '#1E88E5' });
const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

const topics = [
  makeTopic({ id: 1, area_id: 1, name: 'Garden', open_count: 2, done_count: 1, status_note: 'Bulbs in.', status_note_updated_at: daysAgo(3) }),
  makeTopic({ id: 2, area_id: 1, name: 'Kitchen reno', open_count: 4, done_count: 2, status_note: 'Waiting on quote.', status_note_updated_at: daysAgo(20) }),
  makeTopic({ id: 3, area_id: 2, name: 'Website', open_count: 1 }),
  makeTopic({ id: 4, area_id: 1, name: 'Old shed', archived: true }),
];

const mockTopics = (data = topics) =>
  vi.mocked(TopicStore.useTopics).mockReturnValue({
    data, isLoading: false, error: null, refetch: vi.fn(), isRefetching: false,
  } as unknown as ReturnType<typeof TopicStore.useTopics>);

const props = { openTopicId: null, onOpenTopic: vi.fn(), onCloseTopic: vi.fn(), highlightTopicIds: [] as number[] };

describe('TopicsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTopics();
  });

  it('lists the selected area\'s active topics with counts, note and age', () => {
    vi.spyOn(AreaContextModule, 'useArea').mockReturnValue(areaContextValue({ areas: [home, work], currentArea: home }));
    render(<TopicsView {...props} />);
    expect(TopicStore.useTopics).toHaveBeenCalledWith({ areaId: 1, includeArchived: true });
    const garden = screen.getByRole('button', { name: /Garden/ });
    expect(within(garden).getByText('2 open · 1 done')).toBeInTheDocument();
    expect(within(garden).getByText('Bulbs in.')).toBeInTheDocument();
    expect(within(garden).getByText('Note updated 3 days ago')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Website/ })).not.toBeInTheDocument();
  });

  it('marks a stale topic and counts it in the header', () => {
    vi.spyOn(AreaContextModule, 'useArea').mockReturnValue(areaContextValue({ areas: [home, work], currentArea: home }));
    render(<TopicsView {...props} />);
    expect(within(screen.getByRole('button', { name: /Kitchen reno/ })).getByText('stale')).toBeInTheDocument();
    expect(within(screen.getByRole('button', { name: /Garden/ })).queryByText('stale')).not.toBeInTheDocument();
    const totals = screen.getByRole('group', { name: 'Totals' });
    expect(totals).toHaveTextContent('2 active');
    expect(totals).toHaveTextContent('1 stale');
  });

  it('keeps archived topics in a collapsed section', async () => {
    vi.spyOn(AreaContextModule, 'useArea').mockReturnValue(areaContextValue({ areas: [home], currentArea: home }));
    render(<TopicsView {...props} />);
    expect(screen.queryByRole('button', { name: /Old shed/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Archived (1)' }));
    expect(screen.getByRole('button', { name: /Old shed/ })).toBeInTheDocument();
  });

  it('on All areas shows one section per area, skipping areas with no topics', () => {
    const empty = makeArea({ id: 9, name: 'Empty' });
    vi.spyOn(AreaContextModule, 'useArea').mockReturnValue(areaContextValue({ areas: [home, work, empty], currentArea: null }));
    render(<TopicsView {...props} />);
    expect(TopicStore.useTopics).toHaveBeenCalledWith({ areaId: null, includeArchived: true });
    const homeSection = screen.getByRole('region', { name: 'Home' });
    expect(within(homeSection).getByRole('button', { name: /Garden/ })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Work' })).getByRole('button', { name: /Website/ })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Empty' })).not.toBeInTheDocument();
  });

  it('shows the empty state', () => {
    mockTopics([]);
    vi.spyOn(AreaContextModule, 'useArea').mockReturnValue(areaContextValue({ areas: [home], currentArea: home }));
    render(<TopicsView {...props} />);
    expect(screen.getByText('No topics yet.')).toBeInTheDocument();
    expect(screen.getByText('Create one, or ask Claude to propose some.')).toBeInTheDocument();
  });

  it('opens a card and renders detail for the open topic', async () => {
    vi.spyOn(AreaContextModule, 'useArea').mockReturnValue(areaContextValue({ areas: [home], currentArea: home }));
    const { rerender } = render(<TopicsView {...props} />);
    await userEvent.click(screen.getByRole('button', { name: /Garden/ }));
    expect(props.onOpenTopic).toHaveBeenCalledWith(1);
    rerender(<TopicsView {...props} openTopicId={1} />);
    expect(screen.getByText('detail-1')).toBeInTheDocument();
  });

  it('keeps detail open across a switch to All areas (detail loads by id)', () => {
    vi.spyOn(AreaContextModule, 'useArea').mockReturnValue(areaContextValue({ areas: [home, work], currentArea: null }));
    render(<TopicsView {...props} openTopicId={2} />);
    expect(screen.getByText('detail-2')).toBeInTheDocument();
  });

  it('returns from detail to the per-area sections through the back control', async () => {
    vi.spyOn(AreaContextModule, 'useArea').mockReturnValue(areaContextValue({ areas: [home, work], currentArea: null }));
    const Harness = () => {
      const [openTopicId, setOpenTopicId] = useState<number | null>(null);
      return <TopicsView openTopicId={openTopicId} onOpenTopic={setOpenTopicId} onCloseTopic={() => setOpenTopicId(null)} />;
    };
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /Website/ }));
    expect(screen.getByText('detail-3')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Home' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '← Topics' }));
    expect(screen.queryByText('detail-3')).not.toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Home' })).getByRole('button', { name: /Garden/ })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Work' })).getByRole('button', { name: /Website/ })).toBeInTheDocument();
  });

  it('New topic passes the selected area, or none on All areas', async () => {
    vi.spyOn(AreaContextModule, 'useArea').mockReturnValue(areaContextValue({ areas: [home], currentArea: home }));
    const { unmount } = render(<TopicsView {...props} />);
    await userEvent.click(screen.getByRole('button', { name: 'New topic' }));
    expect(screen.getByText('new-topic-dialog area=1')).toBeInTheDocument();
    unmount();
    vi.spyOn(AreaContextModule, 'useArea').mockReturnValue(areaContextValue({ areas: [home], currentArea: null }));
    render(<TopicsView {...props} />);
    await userEvent.click(screen.getByRole('button', { name: 'New topic' }));
    expect(screen.getByText('new-topic-dialog area=null')).toBeInTheDocument();
  });

  it('shows the proposal banner and highlights topics handed back from a review', () => {
    vi.spyOn(AreaContextModule, 'useArea').mockReturnValue(areaContextValue({ areas: [home], currentArea: home }));
    render(<TopicsView {...props} highlightTopicIds={[1]} />);
    expect(screen.getByText('proposal-banner')).toBeInTheDocument();
    const garden = screen.getByRole('button', { name: /Garden/ });
    expect(garden).toHaveClass('bg-accent-soft');
    // The highlight replaces the card surface rather than stacking on it (ruling M1)
    expect(garden).not.toHaveClass('bg-surface');
    expect(screen.getByRole('button', { name: /Kitchen reno/ })).not.toHaveClass('bg-accent-soft');
  });
});
