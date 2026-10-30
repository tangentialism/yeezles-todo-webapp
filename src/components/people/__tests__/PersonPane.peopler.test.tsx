import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PersonPane from '../PersonPane';
import * as AreaContextModule from '../../../contexts/AreaContext';
import * as PeopleStore from '../../../hooks/usePeopleStore';
import * as PeoplerStore from '../../../hooks/usePeoplerStore';
import * as TodoStore from '../../../hooks/useTodoStore';
import { PersonNavigationContext } from '../../../hooks/useOpenPerson';
import { ApiError } from '../../../services/apiError';
import { areaContextValue, makeArea } from '../../../test/topicFactories';
import { makePerson, makeTodoPerson } from '../../../test/personFactories';
import type { PeoplerConnection } from '../../../types/peopler';
import type { Todo } from '../../../types/todo';

vi.mock('../../../contexts/AreaContext');
vi.mock('../../../hooks/usePeopleStore');
vi.mock('../../../hooks/usePeoplerStore');
vi.mock('../../../hooks/useTodoStore');
vi.mock('../../TodoActions', () => ({ default: () => null }));
vi.mock('../../TodayToggle', () => ({ default: () => null }));
vi.mock('../../EditTodoModal', () => ({ default: () => null }));
vi.mock('../LinkPeoplerDialog', () => ({
  default: ({ mode, onMergeInto, onClose }: { mode: string; onMergeInto: (id: number) => void; onClose: () => void }) => (
    <div data-testid="link-dialog">
      {mode}
      <button type="button" onClick={() => onMergeInto(8)}>mock merge into 8</button>
      <button type="button" onClick={onClose}>mock close</button>
    </div>
  ),
}));
vi.mock('../MergePersonDialog', () => ({
  default: ({ initialIntoId }: { initialIntoId?: number }) => <div data-testid="merge-dialog">{String(initialIntoId)}</div>,
}));

const home = makeArea({ id: 1, name: 'Home' });
const me = makeTodoPerson({ id: 1, display_name: 'Priya Raman' });
const linked = makePerson({
  id: 1, display_name: 'Priya Raman', peopler_id: 77, peopler_link: 'ok', peopler_url: 'https://peopler.example.test/people/77',
});
const unlinked = makePerson({ id: 1, display_name: 'Priya Raman' });

const todo: Todo = {
  id: 1, title: 'Order tiles', description: '', completed: false, due_date: null, is_today: false, area_id: 1,
  reference_url: null, created_at: '', updated_at: '', completed_at: null, people: [me],
};

const query = <T,>(data: T) => ({ data, isLoading: false, error: null, refetch: vi.fn() });
const asReturn = <T,>(value: unknown) => value as T;
const updatePerson = vi.fn();

const connected: PeoplerConnection = {
  connected: true, status: 'ok', peopler_email: 'quill@example.test', peopler_display_name: null,
  peopler_account_id: 4, last_verified_at: '2026-10-30T00:00:00.000Z',
};
const setConnection = (data: PeoplerConnection | undefined) =>
  vi.mocked(PeoplerStore.usePeoplerConnection).mockReturnValue(
    asReturn<ReturnType<typeof PeoplerStore.usePeoplerConnection>>({ data })
  );
const setPerson = (p: ReturnType<typeof makePerson>) =>
  vi.mocked(PeopleStore.usePerson).mockReturnValue(asReturn<ReturnType<typeof PeopleStore.usePerson>>(query(p)));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(AreaContextModule, 'useArea').mockReturnValue(areaContextValue({ areas: [home], currentArea: null }));
  setPerson(linked);
  vi.mocked(PeopleStore.usePersonTodos).mockImplementation((_id, completed) =>
    asReturn<ReturnType<typeof PeopleStore.usePersonTodos>>(query(completed ? [] : [todo]))
  );
  vi.mocked(PeopleStore.usePeopleMutations).mockReturnValue(
    asReturn<ReturnType<typeof PeopleStore.usePeopleMutations>>({ updatePerson })
  );
  updatePerson.mockResolvedValue({});
  setConnection(connected);
  vi.mocked(TodoStore.useTodoStore).mockReturnValue(
    asReturn<ReturnType<typeof TodoStore.useTodoStore>>({
      toggleTodoCompletion: vi.fn(),
      getTodoDisplayState: (t: Todo) => ({ completed: t.completed }),
    })
  );
});

const renderPane = () =>
  render(
    <PersonNavigationContext.Provider value={vi.fn()}>
      <PersonPane personId={1} onBack={vi.fn()} onMerged={vi.fn()} onDeleted={vi.fn()} />
    </PersonNavigationContext.Provider>
  );

const openMenu = async () => userEvent.click(screen.getByRole('button', { name: 'Person actions' }));

const STALE = 'This Peopler link is out of date.';
const DORMANT = 'Linked to Peopler — connect Peopler from the account menu to use it.';

describe('PersonPane Peopler link', () => {
  it('runs the check with the loaded person, and todos render while it is pending', () => {
    renderPane();
    expect(vi.mocked(PeoplerStore.usePeoplerCheckOnOpen)).toHaveBeenCalledWith(linked);
    expect(screen.getByText('Order tiles')).toBeInTheDocument();
  });

  it('ok and connected: Open in Peopler and Unlink, no Link to Peopler', async () => {
    renderPane();
    await openMenu();
    const open = screen.getByRole('menuitem', { name: 'Open in Peopler' });
    expect(open).toHaveAttribute('href', 'https://peopler.example.test/people/77');
    expect(open).toHaveAttribute('target', '_blank');
    expect(open).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.queryByRole('menuitem', { name: 'Link to Peopler…' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Unlink from Peopler' }));
    expect(updatePerson).toHaveBeenCalledWith(1, { peopler_id: null });
  });

  it('shows the Peopler error inline when unlink fails', async () => {
    updatePerson.mockRejectedValue(new ApiError(502, 'PEOPLER_UNAVAILABLE', 'x'));
    renderPane();
    await openMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Unlink from Peopler' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't reach Peopler. Try again in a minute.");
  });

  it('none and connected ok: Link to Peopler… opens the dialog in link mode', async () => {
    setPerson(unlinked);
    renderPane();
    expect(screen.queryByTestId('link-dialog')).not.toBeInTheDocument();
    await openMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Link to Peopler…' }));
    expect(screen.getByTestId('link-dialog')).toHaveTextContent('link');
  });

  it('Merge into from the link dialog swaps it for the merge dialog preselected on the holder', async () => {
    setPerson(unlinked);
    renderPane();
    await openMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Link to Peopler…' }));
    await userEvent.click(screen.getByRole('button', { name: 'mock merge into 8' }));
    expect(screen.queryByTestId('link-dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('merge-dialog')).toHaveTextContent('8');
  });

  it('the menu Merge into… opens the merge dialog with no preselection', async () => {
    renderPane();
    await openMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Merge into…' }));
    expect(screen.getByTestId('merge-dialog')).toHaveTextContent('undefined');
  });

  it('opening the link dialog clears an earlier unlink error', async () => {
    updatePerson.mockRejectedValue(new ApiError(502, 'PEOPLER_UNAVAILABLE', 'x'));
    setPerson({ ...linked, peopler_link: 'stale', peopler_url: null });
    renderPane();
    await userEvent.click(screen.getByRole('button', { name: 'Remove link' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Relink…' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('a change in the person link state clears an earlier unlink error', async () => {
    updatePerson.mockRejectedValue(new ApiError(502, 'PEOPLER_UNAVAILABLE', 'x'));
    const { rerender } = renderPane();
    await openMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Unlink from Peopler' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    setPerson({ ...linked, peopler_link: 'stale', peopler_url: null });
    rerender(
      <PersonNavigationContext.Provider value={vi.fn()}>
        <PersonPane personId={1} onBack={vi.fn()} onMerged={vi.fn()} onDeleted={vi.fn()} />
      </PersonNavigationContext.Provider>
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([
    ['disconnected', { connected: false } as PeoplerConnection],
    ['broken', { ...connected, status: 'broken' } as PeoplerConnection],
    ['unknown', undefined],
  ])('none and %s: no Peopler items and no line', async (_name, conn) => {
    setPerson(unlinked);
    setConnection(conn);
    renderPane();
    await openMenu();
    expect(screen.queryByRole('menuitem', { name: /peopler/i })).not.toBeInTheDocument();
    expect(screen.queryByText(STALE)).not.toBeInTheDocument();
    expect(screen.queryByText(DORMANT)).not.toBeInTheDocument();
  });

  describe('stale', () => {
    beforeEach(() => setPerson({ ...linked, peopler_link: 'stale', peopler_url: null }));

    it('shows the line with Relink… and Remove link, and no Open in Peopler', async () => {
      renderPane();
      expect(screen.getByText(STALE)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Relink…' })).toBeInTheDocument();
      await openMenu();
      expect(screen.queryByRole('menuitem', { name: 'Open in Peopler' })).not.toBeInTheDocument();
    });

    it('Remove link unlinks', async () => {
      renderPane();
      await userEvent.click(screen.getByRole('button', { name: 'Remove link' }));
      expect(updatePerson).toHaveBeenCalledWith(1, { peopler_id: null });
    });

    it('Remove link failing shows the error inline', async () => {
      updatePerson.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'Network down'));
      renderPane();
      await userEvent.click(screen.getByRole('button', { name: 'Remove link' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Network down');
    });

    it('Relink… opens the dialog in relink mode', async () => {
      renderPane();
      await userEvent.click(screen.getByRole('button', { name: 'Relink…' }));
      expect(screen.getByTestId('link-dialog')).toHaveTextContent('relink');
    });
  });

  it('dormant: one muted line, no Peopler buttons or menu items', async () => {
    setPerson({ ...linked, peopler_link: 'dormant', peopler_url: null });
    setConnection({ connected: false });
    renderPane();
    expect(screen.getAllByText(DORMANT)).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /link|peopler/i })).toBeNull();
    await openMenu();
    expect(screen.queryByRole('menuitem', { name: /peopler/i })).not.toBeInTheDocument();
  });
});
