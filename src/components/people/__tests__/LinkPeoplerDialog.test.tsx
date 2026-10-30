import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LinkPeoplerDialog from '../LinkPeoplerDialog';
import * as PeopleStore from '../../../hooks/usePeopleStore';
import * as PeoplerStore from '../../../hooks/usePeoplerStore';
import { ApiError } from '../../../services/apiError';
import { makePerson } from '../../../test/personFactories';
import type { PeoplerSearchResult } from '../../../types/peopler';

vi.mock('../../../hooks/usePeopleStore');
vi.mock('../../../hooks/usePeoplerStore');

const asReturn = <T,>(value: unknown) => value as T;
const person = makePerson({ id: 1, display_name: 'Priya Raman' });

const result = (overrides: Partial<PeoplerSearchResult> = {}): PeoplerSearchResult => ({
  id: 501, display_name: 'Tomas Brandt', company: 'Northgate Films', title: 'Producer',
  created_at: '2026-09-01T00:00:00.000Z', already_linked_person_id: null, ...overrides,
});

const updatePerson = vi.fn();
const refetch = vi.fn();
let search: { data?: PeoplerSearchResult[]; error?: unknown; isFetching?: boolean };

const handlers = () => ({ onClose: vi.fn(), onMergeInto: vi.fn() });
const renderDialog = (mode: 'link' | 'relink' = 'link', h = handlers()) => {
  render(<LinkPeoplerDialog person={person} mode={mode} {...h} />);
  return h;
};

beforeEach(() => {
  vi.clearAllMocks();
  search = { data: [result()] };
  vi.mocked(PeoplerStore.usePeoplerSearch).mockImplementation((q: string) =>
    asReturn<ReturnType<typeof PeoplerStore.usePeoplerSearch>>({
      data: q.trim() === '' ? undefined : search.data,
      error: q.trim() === '' ? null : (search.error ?? null),
      isFetching: false,
      refetch,
    })
  );
  vi.mocked(PeopleStore.usePeople).mockReturnValue(
    asReturn<ReturnType<typeof PeopleStore.usePeople>>({
      data: [person, makePerson({ id: 8, display_name: 'Tomas B.' })],
    })
  );
  vi.mocked(PeopleStore.usePeopleMutations).mockReturnValue(
    asReturn<ReturnType<typeof PeopleStore.usePeopleMutations>>({ updatePerson })
  );
  updatePerson.mockResolvedValue({});
});

describe('LinkPeoplerDialog', () => {
  it.each([
    ['link', 'Link to Peopler'],
    ['relink', 'Relink to Peopler'],
  ] as const)('%s mode titles the dialog', (mode, title) => {
    renderDialog(mode);
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
  });

  it('starts the search on the person display name', () => {
    renderDialog();
    expect(screen.getByLabelText('Search your Peopler')).toHaveValue('Priya Raman');
    expect(PeoplerStore.usePeoplerSearch).toHaveBeenCalledWith('Priya Raman');
  });

  it('debounces typed text into the search', async () => {
    renderDialog();
    const input = screen.getByLabelText('Search your Peopler');
    await userEvent.clear(input);
    await userEvent.type(input, 'Tom');
    await waitFor(() => expect(PeoplerStore.usePeoplerSearch).toHaveBeenLastCalledWith('Tom'));
  });

  it('renders name, title and company, and the name alone when both are null', () => {
    search.data = [result(), result({ id: 502, display_name: 'Lena Ortiz', title: null, company: null })];
    renderDialog();
    expect(screen.getByRole('button', { name: 'Tomas Brandt · Producer · Northgate Films' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Lena Ortiz' })).toBeEnabled();
  });

  it('a result already linked to someone else is disabled and offers Merge into', async () => {
    search.data = [result({ already_linked_person_id: 8 })];
    const h = renderDialog();
    expect(screen.getByRole('button', { name: /Tomas Brandt/ })).toBeDisabled();
    expect(screen.getByText('Already linked to Tomas B.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Merge into Tomas B.…' }));
    expect(h.onMergeInto).toHaveBeenCalledWith(8);
  });

  it('names an unloaded holder generically', () => {
    search.data = [result({ already_linked_person_id: 99 })];
    renderDialog();
    expect(screen.getByText('Already linked to another person')).toBeInTheDocument();
  });

  it('a result linked to this very person is pickable', async () => {
    search.data = [result({ already_linked_person_id: 1 })];
    const h = renderDialog('relink');
    expect(screen.queryByText(/Already linked/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Tomas Brandt/ }));
    expect(updatePerson).toHaveBeenCalledWith(1, { peopler_id: 501 });
    await waitFor(() => expect(h.onClose).toHaveBeenCalled());
  });

  it('picking a result links and closes', async () => {
    const h = renderDialog();
    await userEvent.click(screen.getByRole('button', { name: /Tomas Brandt/ }));
    expect(updatePerson).toHaveBeenCalledWith(1, { peopler_id: 501 });
    await waitFor(() => expect(h.onClose).toHaveBeenCalledTimes(1));
  });

  it.each([
    ['PEOPLER_PERSON_NOT_FOUND', 422, "That person isn't in your Peopler any more. Search again."],
    ['PEOPLER_NAME_MISMATCH', 422, 'That Peopler person has a different name. Pick someone else, or rename this person first.'],
    ['PEOPLER_UNAVAILABLE', 502, "Couldn't reach Peopler. Try again in a minute."],
  ])('%s shows its sentence, stays open', async (code, status, text) => {
    updatePerson.mockRejectedValue(new ApiError(status, code, 'x'));
    const h = renderDialog();
    await userEvent.click(screen.getByRole('button', { name: /Tomas Brandt/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(text);
    expect(h.onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Search your Peopler')).toBeInTheDocument();
  });

  it('PEOPLER_ID_TAKEN shows its sentence, refetches, and the refreshed result offers the merge', async () => {
    updatePerson.mockRejectedValue(new ApiError(409, 'PEOPLER_ID_TAKEN', 'x'));
    const h = renderDialog();
    await userEvent.click(screen.getByRole('button', { name: /Tomas Brandt/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Someone else here is already linked to that Peopler person.');
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(h.onClose).not.toHaveBeenCalled();
    search.data = [result({ already_linked_person_id: 8 })];
    vi.mocked(PeoplerStore.usePeoplerSearch).mockClear();
    await userEvent.type(screen.getByLabelText('Search your Peopler'), ' ');
    expect(await screen.findByRole('button', { name: 'Merge into Tomas B.…' })).toBeInTheDocument();
  });

  it('a new pick clears the earlier error', async () => {
    updatePerson.mockRejectedValueOnce(new ApiError(502, 'PEOPLER_UNAVAILABLE', 'x'));
    renderDialog();
    await userEvent.click(screen.getByRole('button', { name: /Tomas Brandt/ }));
    await screen.findByRole('alert');
    await userEvent.click(screen.getByRole('button', { name: /Tomas Brandt/ }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('an empty or whitespace query shows nothing and no no-match line', async () => {
    renderDialog();
    const input = screen.getByLabelText('Search your Peopler');
    await userEvent.clear(input);
    await userEvent.type(input, '   ');
    await new Promise((r) => setTimeout(r, 300));
    expect(screen.queryByRole('button', { name: /Tomas Brandt/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/No one in your Peopler/)).not.toBeInTheDocument();
  });

  it('a query with no hits says so', async () => {
    renderDialog();
    search.data = [];
    const input = screen.getByLabelText('Search your Peopler');
    await userEvent.clear(input);
    await userEvent.type(input, 'Zed');
    expect(await screen.findByText('No one in your Peopler matches "Zed".')).toBeInTheDocument();
  });

  it('a search error shows the Peopler message', () => {
    search = { error: new ApiError(400, 'PEOPLER_NOT_CONNECTED', 'x') };
    renderDialog();
    expect(screen.getByRole('alert')).toHaveTextContent('Connect Peopler from the account menu first.');
  });
});
