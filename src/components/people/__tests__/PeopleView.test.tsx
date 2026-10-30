import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PeopleView from '../PeopleView';
import * as AreaContextModule from '../../../contexts/AreaContext';
import * as PeopleStore from '../../../hooks/usePeopleStore';
import * as PeoplerStore from '../../../hooks/usePeoplerStore';
import * as TodoStore from '../../../hooks/useTodoStore';
import { areaContextValue, makeArea } from '../../../test/topicFactories';
import { makePerson } from '../../../test/personFactories';
import type { Todo } from '../../../types/todo';

vi.mock('../../../contexts/AreaContext');
vi.mock('../../../hooks/usePeopleStore');
vi.mock('../../../hooks/usePeoplerStore');
vi.mock('../../../hooks/useTodoStore');
vi.mock('../../TodoActions', () => ({ default: () => null }));
vi.mock('../../TodayToggle', () => ({ default: () => null }));
vi.mock('../../EditTodoModal', () => ({ default: () => null }));

const home = makeArea({ id: 1, name: 'Home' });
const work = makeArea({ id: 2, name: 'Work', color: '#1E88E5' });
const priya = makePerson({ id: 1, display_name: 'Priya Raman', open_count: 3, done_count: 1, peopler_id: 1, peopler_link: 'ok' });
const sam = makePerson({ id: 2, display_name: 'Sam Lee', open_count: 0, done_count: 2 });

const query = <T,>(data: T) => ({ data, isLoading: false, error: null, refetch: vi.fn() });
const asReturn = <T,>(value: unknown) => value as T;

const mockPeople = (people = [priya, sam]) =>
  vi.mocked(PeopleStore.usePeople).mockReturnValue(asReturn<ReturnType<typeof PeopleStore.usePeople>>(query(people)));

const renderView = (openPersonId: number | null = null, handlers = { onOpenPerson: vi.fn(), onClosePerson: vi.fn() }, openPersonSeq = 0) =>
  render(<PeopleView openPersonId={openPersonId} openPersonSeq={openPersonSeq} {...handlers} />);

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(AreaContextModule, 'useArea').mockReturnValue(areaContextValue({ areas: [home, work], currentArea: home }));
  mockPeople();
  vi.mocked(PeopleStore.usePerson).mockImplementation((id) =>
    asReturn<ReturnType<typeof PeopleStore.usePerson>>(query(id === 2 ? sam : priya))
  );
  vi.mocked(PeopleStore.usePersonTodos).mockReturnValue(asReturn<ReturnType<typeof PeopleStore.usePersonTodos>>(query([])));
  vi.mocked(PeopleStore.usePeopleMutations).mockReturnValue(
    asReturn<ReturnType<typeof PeopleStore.usePeopleMutations>>({ updatePerson: vi.fn() })
  );
  vi.mocked(PeoplerStore.usePeoplerConnection).mockReturnValue(
    asReturn<ReturnType<typeof PeoplerStore.usePeoplerConnection>>({ data: { connected: false } })
  );
  vi.mocked(TodoStore.useTodoStore).mockReturnValue(
    asReturn<ReturnType<typeof TodoStore.useTodoStore>>({
      toggleTodoCompletion: vi.fn(),
      getTodoDisplayState: (t: Todo) => ({ completed: t.completed }),
    })
  );
});

describe('PeopleView list', () => {
  it.each([
    ['ok', 'Linked to Peopler', 'Peopler link out of date'],
    ['stale', 'Peopler link out of date', 'Linked to Peopler'],
    ['dormant', null, 'Linked to Peopler'],
    ['none', null, 'Linked to Peopler'],
  ] as const)('badge for %s', (link, shown, absent) => {
    mockPeople([makePerson({ id: 3, display_name: 'Avery Quill', peopler_id: link === 'none' ? null : 9, peopler_link: link })]);
    renderView();
    if (shown) expect(screen.getByRole('img', { name: shown })).toBeInTheDocument();
    else expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: absent })).not.toBeInTheDocument();
  });

  it('bounds the sticky list so its lower rows scroll inside it (classes only; jsdom has no layout)', () => {
    renderView();
    const pane = screen.getByTestId('people-list-pane');
    expect(pane).toHaveClass('sm:sticky', 'sm:top-4', 'sm:overflow-y-auto');
    expect(pane.className).toMatch(/sm:max-h-\[/);
  });

  it('shows the empty copy with no people', () => {
    mockPeople([]);
    renderView();
    expect(screen.getByText("No people yet. Tag someone from a todo's People field.")).toBeInTheDocument();
  });

  it('shows name, open count, and the Peopler badge only when linked', () => {
    renderView();
    const rows = within(screen.getByRole('list', { name: 'People' })).getAllByRole('button');
    expect(within(rows[0]).getByText('Priya Raman')).toBeInTheDocument();
    expect(within(rows[0]).getByText('3')).toBeInTheDocument();
    expect(within(rows[0]).getByLabelText('Linked to Peopler')).toBeInTheDocument();
    expect(within(rows[1]).queryByLabelText('Linked to Peopler')).not.toBeInTheDocument();
  });

  it('dims a person with no open todos but still lists them', () => {
    renderView();
    const row = screen.getByRole('button', { name: /Sam Lee/ });
    expect(row).toHaveClass('text-ink-faint');
    expect(screen.getByRole('button', { name: /Priya Raman/ })).not.toHaveClass('text-ink-faint');
  });

  it('shows the footer at exactly 100 people and not at 99', () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => makePerson({ id: i + 1, display_name: `P${i + 1}` }));
    mockPeople(many(100));
    const { unmount } = renderView();
    expect(screen.getByText('Showing the 100 most recently tagged.')).toBeInTheDocument();
    unmount();
    mockPeople(many(99));
    renderView();
    expect(screen.queryByText('Showing the 100 most recently tagged.')).not.toBeInTheDocument();
  });

  it('shows an error with retry', async () => {
    const refetch = vi.fn();
    vi.mocked(PeopleStore.usePeople).mockReturnValue(
      asReturn<ReturnType<typeof PeopleStore.usePeople>>({ data: undefined, isLoading: false, error: new Error('boom'), refetch })
    );
    renderView();
    await userEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('calls onOpenPerson when a row is clicked and marks the selected row', async () => {
    const onOpenPerson = vi.fn();
    const { unmount } = renderView(null, { onOpenPerson, onClosePerson: vi.fn() });
    await userEvent.click(screen.getByRole('button', { name: /Sam Lee/ }));
    expect(onOpenPerson).toHaveBeenCalledWith(2);
    unmount();
    renderView(1);
    expect(screen.getByRole('button', { name: /Priya Raman/ })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: /Sam Lee/ })).not.toHaveAttribute('aria-current');
  });
});

describe('PeopleView layout', () => {
  it('with nothing selected shows the prompt, the list, and a hidden-on-phone pane', () => {
    renderView();
    expect(screen.getByText('Pick a person to see their todos.')).toBeInTheDocument();
    expect(screen.getByTestId('people-list-pane')).not.toHaveClass('hidden');
    expect(screen.getByTestId('people-detail-pane')).toHaveClass('hidden', 'sm:block');
    expect(screen.queryByRole('button', { name: '← People' })).not.toBeInTheDocument();
  });

  it('with a selection hides the list on phones and shows a back control that closes', async () => {
    const onClosePerson = vi.fn();
    renderView(1, { onOpenPerson: vi.fn(), onClosePerson });
    expect(screen.getByTestId('people-list-pane')).toHaveClass('hidden', 'sm:block');
    expect(screen.getByTestId('people-detail-pane')).not.toHaveClass('hidden');
    const back = screen.getByRole('button', { name: '← People' });
    expect(back).toHaveClass('sm:hidden');
    await userEvent.click(back);
    expect(onClosePerson).toHaveBeenCalledTimes(1);
  });

  it('keys the pane by person: switching people resets Show completed', async () => {
    const handlers = { onOpenPerson: vi.fn(), onClosePerson: vi.fn() };
    const { rerender } = render(<PeopleView openPersonId={1} {...handlers} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Show completed' }));
    expect(screen.getByRole('checkbox', { name: 'Show completed' })).toBeChecked();
    rerender(<PeopleView openPersonId={2} {...handlers} />);
    expect(screen.getByRole('heading', { name: 'Sam Lee' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Show completed' })).not.toBeChecked();
  });

  it('ignores the area switcher: queries are identical for any current area', () => {
    const { unmount } = renderView(1);
    const peopleCalls = vi.mocked(PeopleStore.usePeople).mock.calls.map((c) => JSON.stringify(c));
    const todoCalls = vi.mocked(PeopleStore.usePersonTodos).mock.calls.map((c) => JSON.stringify(c));
    unmount();
    vi.clearAllMocks();
    vi.spyOn(AreaContextModule, 'useArea').mockReturnValue(areaContextValue({ areas: [home, work], currentArea: work }));
    renderView(1);
    expect(vi.mocked(PeopleStore.usePeople).mock.calls.map((c) => JSON.stringify(c))).toEqual(peopleCalls);
    expect(vi.mocked(PeopleStore.usePersonTodos).mock.calls.map((c) => JSON.stringify(c))).toEqual(todoCalls);
    expect(screen.getByRole('heading', { name: 'People' })).toBeInTheDocument();
  });

  it('deleting the selected person clears the selection, which on phones returns to the list', async () => {
    const deletePerson = vi.fn().mockResolvedValue(undefined);
    vi.mocked(PeopleStore.usePeopleMutations).mockReturnValue(
      asReturn<ReturnType<typeof PeopleStore.usePeopleMutations>>({ deletePerson, isDeleting: false })
    );
    const Harness = () => {
      const [id, setId] = useState<number | null>(1);
      return <PeopleView openPersonId={id} onOpenPerson={setId} onClosePerson={() => setId(null)} />;
    };
    render(<Harness />);
    expect(screen.getByTestId('people-list-pane')).toHaveClass('hidden');
    await userEvent.click(screen.getByRole('button', { name: 'Person actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete…' }));
    expect(
      screen.getByText('Delete "Priya Raman"? Their tags are removed from 4 todos; the todos stay.')
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete person' }));
    expect(deletePerson).toHaveBeenCalledWith(1);
    expect(await screen.findByText('Pick a person to see their todos.')).toBeInTheDocument();
    expect(screen.getByTestId('people-list-pane')).not.toHaveClass('hidden');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('PeopleView: every open rechecks the Peopler link', () => {
  it('remounts the pane when the open counter changes for the same person, and not otherwise', () => {
    const mounted = vi.fn();
    vi.mocked(PeoplerStore.usePeoplerCheckOnOpen).mockImplementation(() => {
      React.useEffect(() => { mounted(); }, []);
    });
    const handlers = { onOpenPerson: vi.fn(), onClosePerson: vi.fn() };
    const { rerender } = render(<PeopleView openPersonId={1} openPersonSeq={1} {...handlers} />);
    expect(mounted).toHaveBeenCalledTimes(1);
    rerender(<PeopleView openPersonId={1} openPersonSeq={1} {...handlers} />);
    expect(mounted).toHaveBeenCalledTimes(1);
    rerender(<PeopleView openPersonId={1} openPersonSeq={2} {...handlers} />);
    expect(mounted).toHaveBeenCalledTimes(2);
  });
});
