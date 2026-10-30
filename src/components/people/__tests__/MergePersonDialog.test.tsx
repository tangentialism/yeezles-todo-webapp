import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '../../../services/apiError';
import { areaContextValue } from '../../../test/topicFactories';
import { makePerson } from '../../../test/personFactories';
import * as AreaContextModule from '../../../contexts/AreaContext';
import * as TodoStore from '../../../hooks/useTodoStore';
import type { Todo } from '../../../types/todo';

const api = vi.hoisted(() => ({
  getPeople: vi.fn(),
  getPerson: vi.fn(),
  getTodos: vi.fn(),
  mergePerson: vi.fn(),
}));
vi.mock('../../../hooks/useApi', () => ({ useApi: () => api }));
vi.mock('../../../hooks/useCrossTabSync', () => ({ useCrossTabSync: () => ({ broadcast: vi.fn() }) }));
vi.mock('../../../contexts/AreaContext');
vi.mock('../../../hooks/useTodoStore');
vi.mock('../../TodoActions', () => ({ default: () => null }));
vi.mock('../../TodayToggle', () => ({ default: () => null }));
vi.mock('../../EditTodoModal', () => ({ default: () => null }));

import MergePersonDialog from '../MergePersonDialog';
import PeopleView from '../PeopleView';
import { personKeys } from '../../../hooks/peopleInvalidation';

const priya = makePerson({ id: 4, display_name: 'Priya Raman' });
const zed = makePerson({ id: 2, display_name: 'Zed Last' });
const amy = makePerson({ id: 9, display_name: 'Amy First' });

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderDialog = (initialIntoId?: number) => {
  const handlers = { onClose: vi.fn(), onMerged: vi.fn() };
  render(
    <QueryClientProvider client={makeClient()}>
      <MergePersonDialog person={priya} initialIntoId={initialIntoId} {...handlers} />
    </QueryClientProvider>
  );
  return handlers;
};
const picker = () => screen.findByLabelText('Merge into');
const confirm = () => userEvent.click(screen.getByRole('button', { name: 'Merge' }));

beforeEach(() => {
  vi.clearAllMocks();
  api.getPeople.mockResolvedValue([priya, zed, amy]);
  api.mergePerson.mockResolvedValue({ ...amy });
});

describe('MergePersonDialog', () => {
  it('lists everyone except the current person, sorted by name', async () => {
    renderDialog();
    const select = await picker();
    await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(3));
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Choose a person…',
      'Amy First',
      'Zed Last',
    ]);
    expect(within(select).queryByRole('option', { name: 'Priya Raman' })).not.toBeInTheDocument();
    expect(api.getPeople).toHaveBeenCalledWith({ q: '', limit: 100 });
  });

  it('names both people in the confirm copy once a target is chosen, and disables Merge before', async () => {
    renderDialog();
    const select = await picker();
    expect(screen.getByRole('button', { name: 'Merge' })).toBeDisabled();
    await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(3));
    await userEvent.selectOptions(select, 'Amy First');
    expect(
      screen.getByText('Merge "Priya Raman" into "Amy First"? Priya Raman\'s todos move to Amy First, and "Priya Raman" becomes one of Amy First\'s aliases.')
    ).toBeInTheDocument();
  });

  it('initialIntoId preselects that person and enables Merge', async () => {
    const { onMerged } = renderDialog(9);
    const select = await picker();
    await waitFor(() => expect(select).toHaveValue('9'));
    expect(screen.getByRole('button', { name: 'Merge' })).toBeEnabled();
    await confirm();
    await waitFor(() => expect(onMerged).toHaveBeenCalledWith(9));
    expect(api.mergePerson).toHaveBeenCalledWith(4, 9);
  });

  it('without initialIntoId nothing is preselected', async () => {
    renderDialog();
    expect(await picker()).toHaveValue('');
  });

  it('merges and calls onMerged with the chosen id', async () => {
    const { onMerged } = renderDialog();
    const select = await picker();
    await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(3));
    await userEvent.selectOptions(select, 'Amy First');
    await confirm();
    await waitFor(() => expect(onMerged).toHaveBeenCalledWith(9));
    expect(api.mergePerson).toHaveBeenCalledWith(4, 9);
  });

  it('shows the conflict copy on a 409 and stays open', async () => {
    api.mergePerson.mockRejectedValue(new ApiError(409, 'PERSON_MERGE_CONFLICT', 'conflict'));
    const { onMerged, onClose } = renderDialog();
    const select = await picker();
    await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(3));
    await userEvent.selectOptions(select, 'Amy First');
    await confirm();
    expect(await screen.findByText('Both are linked to different Peopler people. Unlink one first.')).toBeInTheDocument();
    expect(onMerged).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

// Review focus 2: merging the selected A into B selects B, drops A from the list and the cache.
describe('merging from the People view', () => {
  const todo: Todo = {
    id: 1, title: 'Order tiles', description: '', completed: false, due_date: null, is_today: false, area_id: null,
    reference_url: null, created_at: '', updated_at: '', completed_at: null, people: [],
  };

  it('selects the survivor, removes the merged person from the list and the cache', async () => {
    vi.spyOn(AreaContextModule, 'useArea').mockReturnValue(areaContextValue({ areas: [], currentArea: null }));
    vi.mocked(TodoStore.useTodoStore).mockReturnValue({
      toggleTodoCompletion: vi.fn(),
      getTodoDisplayState: (t: Todo) => ({ completed: t.completed }),
    } as unknown as ReturnType<typeof TodoStore.useTodoStore>);
    let merged = false;
    const byId: Record<number, ReturnType<typeof makePerson>> = { 4: priya, 9: amy };
    api.getPeople.mockImplementation(async () => (merged ? [amy] : [priya, amy]));
    api.getPerson.mockImplementation(async (id: number) => byId[id]);
    api.getTodos.mockResolvedValue({ success: true, data: [todo] });
    api.mergePerson.mockImplementation(async () => {
      merged = true;
      return { ...amy };
    });

    const client = makeClient();
    const Harness = () => {
      const [id, setId] = useState<number | null>(4);
      return <PeopleView openPersonId={id} onOpenPerson={setId} onClosePerson={() => setId(null)} />;
    };
    render(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>
    );

    expect(await screen.findByRole('heading', { name: 'Priya Raman' })).toBeInTheDocument();
    await waitFor(() => expect(client.getQueryData(personKeys.one(4))).toBeDefined());

    await userEvent.click(screen.getByRole('button', { name: 'Person actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Merge into…' }));
    const select = await picker();
    await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(2));
    await userEvent.selectOptions(select, 'Amy First');
    await confirm();

    expect(await screen.findByRole('heading', { name: 'Amy First' })).toBeInTheDocument();
    await waitFor(() =>
      expect(within(screen.getByRole('list', { name: 'People' })).queryByText('Priya Raman')).not.toBeInTheDocument()
    );
    expect(client.getQueryData(personKeys.one(4))).toBeUndefined();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
