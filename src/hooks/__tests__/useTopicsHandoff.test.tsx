import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useTopicsHandoff } from '../useTopicsHandoff';
import * as AreaContextModule from '../../contexts/AreaContext';
import { areaContextValue, makeArea } from '../../test/topicFactories';

vi.mock('../../contexts/AreaContext');

describe('useTopicsHandoff', () => {
  it('selects the area, reports the hand-back once, and clears it from history', () => {
    const work = makeArea({ id: 2, name: 'Work' });
    const setCurrentArea = vi.fn();
    vi.spyOn(AreaContextModule, 'useArea').mockReturnValue(areaContextValue({ areas: [work], setCurrentArea }));
    const onArrive = vi.fn();
    const { result } = renderHook(
      () => {
        useTopicsHandoff(onArrive);
        return useLocation();
      },
      {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <MemoryRouter initialEntries={[{ pathname: '/', state: { view: 'topics', areaId: 2, highlightTopicIds: [30] } }]}>{children}</MemoryRouter>
        ),
      }
    );
    expect(setCurrentArea).toHaveBeenCalledWith(work);
    expect(onArrive).toHaveBeenCalledTimes(1);
    expect(onArrive).toHaveBeenCalledWith({ view: 'topics', areaId: 2, highlightTopicIds: [30] });
    expect(result.current.state).toBeNull();
  });

  it('ignores ordinary navigation state', () => {
    vi.spyOn(AreaContextModule, 'useArea').mockReturnValue(areaContextValue({ areas: [makeArea()] }));
    const onArrive = vi.fn();
    renderHook(() => useTopicsHandoff(onArrive), {
      wrapper: ({ children }: { children: React.ReactNode }) => <MemoryRouter initialEntries={[{ pathname: '/', state: { from: 'x' } }]}>{children}</MemoryRouter>,
    });
    expect(onArrive).not.toHaveBeenCalled();
  });
});
