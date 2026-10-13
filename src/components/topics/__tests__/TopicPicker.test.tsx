import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TopicPicker from '../TopicPicker';
import * as AreaContextModule from '../../../contexts/AreaContext';
import * as TopicStore from '../../../hooks/useTopicStore';
import { areaContextValue, makeArea, makeTopic } from '../../../test/topicFactories';

vi.mock('../../../contexts/AreaContext');
vi.mock('../../../hooks/useTopicStore');
vi.mock('../NewTopicDialog', () => ({
  default: ({ defaultAreaId, onCreated }: { defaultAreaId: number | null; onCreated: (t: { id: number; area_id: number; name: string }) => void }) => (
    <button type="button" onClick={() => onCreated({ id: 99, area_id: defaultAreaId ?? 2, name: 'Fresh' })}>
      create-in-{String(defaultAreaId)}
    </button>
  ),
}));

const home = makeArea({ id: 1, name: 'Home' });
const work = makeArea({ id: 2, name: 'Work' });
const topics = [
  makeTopic({ id: 1, area_id: 1, name: 'Garden' }),
  makeTopic({ id: 2, area_id: 1, name: 'Kitchen reno' }),
  makeTopic({ id: 3, area_id: 2, name: 'Website' }),
];

describe('TopicPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AreaContextModule, 'useArea').mockReturnValue(areaContextValue({ areas: [home, work] }));
    vi.mocked(TopicStore.useTopics).mockReturnValue({ data: topics } as unknown as ReturnType<typeof TopicStore.useTopics>);
  });

  it('with an area chosen lists None, that area\'s topics, then New topic…', () => {
    render(<TopicPicker id="t" areaId={1} value={null} onChange={vi.fn()} />);
    const options = within(screen.getByLabelText('Topic')).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['None', 'Garden', 'Kitchen reno', 'New topic…']);
  });

  it('with no area groups every topic by area and reports the topic\'s area', async () => {
    const onChange = vi.fn();
    render(<TopicPicker id="t" areaId={null} value={null} onChange={onChange} />);
    const select = screen.getByLabelText('Topic');
    expect(within(select).getAllByRole('group').map((g) => g.getAttribute('label'))).toEqual(['Home', 'Work']);
    await userEvent.selectOptions(select, 'Website');
    expect(onChange).toHaveBeenCalledWith(3, 2);
  });

  it('None reports nulls', async () => {
    const onChange = vi.fn();
    render(<TopicPicker id="t" areaId={1} value={1} onChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText('Topic'), 'None');
    expect(onChange).toHaveBeenCalledWith(null, null);
  });

  it('keeps an archived current topic listed and selected', () => {
    render(<TopicPicker id="t" areaId={1} value={8} currentTopic={{ id: 8, name: 'Old shed' }} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Topic')).toHaveDisplayValue('Old shed (archived)');
  });

  it('New topic… creates in the form\'s area and selects the new topic', async () => {
    const onChange = vi.fn();
    render(<TopicPicker id="t" areaId={1} value={null} onChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText('Topic'), 'New topic…');
    await userEvent.click(screen.getByRole('button', { name: 'create-in-1' }));
    expect(onChange).toHaveBeenCalledWith(99, 1);
  });

  it('shows the cleared hint when asked', () => {
    render(<TopicPicker id="t" areaId={1} value={null} onChange={vi.fn()} showCleared />);
    expect(screen.getByText('Topic cleared: topics belong to one area.')).toBeInTheDocument();
  });
});
