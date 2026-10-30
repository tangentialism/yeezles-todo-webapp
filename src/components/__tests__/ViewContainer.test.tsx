import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ViewContainer from '../ViewContainer';

vi.mock('../TodoList', () => ({ default: () => <div>all-view</div> }));
vi.mock('../TodayView', () => ({ default: () => <div>today-view</div> }));
vi.mock('../AccomplishmentsView', () => ({ default: () => <div>done-view</div> }));
vi.mock('../topics/TopicsView', () => ({ default: () => <div>topics-view</div> }));
vi.mock('../people/PeopleView', () => ({
  default: ({ openPersonId }: { openPersonId: number | null }) => <div>people-view {openPersonId ?? 'none'}</div>,
}));

const labels = ['all-view', 'today-view', 'topics-view', 'people-view none', 'done-view'];

describe('ViewContainer', () => {
  it('keeps all five views mounted and shows only the active one', () => {
    const { rerender } = render(
      <ViewContainer
        currentView="people"
        isTransitioning={false}
        refreshTrigger={0}
        newTodoId={null}
        onNewTodoAnimationComplete={vi.fn()}
        openTopicId={null}
        onOpenTopic={vi.fn()}
        onCloseTopic={vi.fn()}
        highlightTopicIds={[]}
        openPersonId={null}
        openPersonSeq={0}
        onOpenPerson={vi.fn()}
        onClosePerson={vi.fn()}
      />,
    );
    const wrapper = (text: string) => screen.getByText(text).parentElement as HTMLElement;
    for (const l of labels) expect(screen.getByText(l)).toBeInTheDocument();
    for (const l of labels) {
      expect(wrapper(l).style.visibility).toBe(l === 'people-view none' ? 'visible' : 'hidden');
    }
    rerender(
      <ViewContainer
        currentView="today"
        isTransitioning={false}
        refreshTrigger={0}
        newTodoId={null}
        onNewTodoAnimationComplete={vi.fn()}
        openTopicId={null}
        onOpenTopic={vi.fn()}
        onCloseTopic={vi.fn()}
        highlightTopicIds={[]}
        openPersonId={null}
        openPersonSeq={0}
        onOpenPerson={vi.fn()}
        onClosePerson={vi.fn()}
      />,
    );
    expect(wrapper('people-view none').style.visibility).toBe('hidden');
    expect(wrapper('today-view').style.visibility).toBe('visible');
  });
});
