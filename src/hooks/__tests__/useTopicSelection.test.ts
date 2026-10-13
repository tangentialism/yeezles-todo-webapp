import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useState } from 'react';
import { useTopicSelection } from '../useTopicSelection';

const setup = (initialArea: number | null) =>
  renderHook(() => {
    const [areaId, setAreaId] = useState<number | null>(initialArea);
    return { areaId, ...useTopicSelection(areaId, setAreaId) };
  });

describe('useTopicSelection', () => {
  it('choosing a topic with no area sets the area to the topic\'s', () => {
    const { result } = setup(null);
    act(() => result.current.selectTopic(4, 2));
    expect(result.current.topicId).toBe(4);
    expect(result.current.areaId).toBe(2);
    expect(result.current.cleared).toBe(false);
  });

  it('changing the area away from the topic\'s clears it and flags the hint', () => {
    const { result } = setup(2);
    act(() => result.current.selectTopic(4, 2));
    act(() => result.current.changeArea(1));
    expect(result.current.areaId).toBe(1);
    expect(result.current.topicId).toBeNull();
    expect(result.current.cleared).toBe(true);
  });

  it('re-choosing the same area keeps the topic, and no topic means no hint', () => {
    const { result } = setup(2);
    act(() => result.current.selectTopic(4, 2));
    act(() => result.current.changeArea(2));
    expect(result.current.topicId).toBe(4);
    act(() => result.current.selectTopic(null, null));
    act(() => result.current.changeArea(1));
    expect(result.current.cleared).toBe(false);
  });

  it('picking a topic again hides the hint; reset loads a todo\'s topic', () => {
    const { result } = setup(2);
    act(() => result.current.selectTopic(4, 2));
    act(() => result.current.changeArea(1));
    act(() => result.current.selectTopic(5, 1));
    expect(result.current.cleared).toBe(false);
    act(() => result.current.reset(7, 1));
    expect(result.current.topicId).toBe(7);
  });
});
