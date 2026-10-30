import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '../../../services/apiError';
import { makePerson, makeTodoPerson } from '../../../test/personFactories';
import type { TodoPerson } from '../../../types/person';

const api = vi.hoisted(() => ({ getPeople: vi.fn(), createPerson: vi.fn() }));
vi.mock('../../../hooks/useApi', () => ({ useApi: () => api }));
vi.mock('../../../hooks/useCrossTabSync', () => ({ useCrossTabSync: () => ({ broadcast: vi.fn() }) }));
const phone = vi.hoisted(() => ({ isPhone: false }));
vi.mock('../../../hooks/useIsPhone', () => ({ useIsPhone: () => phone.isPhone }));

import PeopleField from '../PeopleField';
import Dialog from '../../ui/Dialog';

const priya = makePerson({ id: 1, display_name: 'Priya Raman', peopler_id: 42, peopler_url: 'https://peopler.example/p/42' });
const chosen = makeTodoPerson({ id: 2, display_name: 'Pri Chosen' });

interface HarnessProps {
  initial?: TodoPerson[];
  onChange?: (next: TodoPerson[]) => void;
  /** Wraps the field in a Dialog, as the add and edit forms will. */
  onDialogClose?: () => void;
}

const Harness = ({ initial = [], onChange = () => {}, onDialogClose }: HarnessProps) => {
  const [value, setValue] = useState<TodoPerson[]>(initial);
  const field = (
    <PeopleField
      id="todo-people"
      value={value}
      onChange={(next) => {
        onChange(next);
        setValue(next);
      }}
    />
  );
  return onDialogClose ? <Dialog title="New todo" onClose={onDialogClose}>{field}</Dialog> : field;
};

const renderField = (props: HarnessProps = {}) => {
  const onChange = props.onChange ?? vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Harness {...props} onChange={onChange} />
    </QueryClientProvider>
  );
  return { onChange };
};

const optionNames = () => screen.getAllByRole('option').map((o) => o.textContent);

beforeEach(() => {
  vi.clearAllMocks();
  phone.isPhone = false;
  api.getPeople.mockResolvedValue([priya]);
});

describe('PeopleField', () => {
  it('labels the combobox "People" with "optional" beside it', () => {
    renderField();
    const input = screen.getByRole('combobox', { name: 'People' });
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('optional')).toBeInTheDocument();
  });

  it('queries once after the debounce, lists matches then Create, and leaves out chosen people', async () => {
    api.getPeople.mockResolvedValue([priya, makePerson({ ...chosen })]);
    renderField({ initial: [chosen] });
    const input = screen.getByRole('combobox', { name: 'People' });
    await userEvent.type(input, 'pri');
    await screen.findByRole('option', { name: 'Priya Raman' });
    expect(api.getPeople).toHaveBeenCalledTimes(1);
    expect(api.getPeople).toHaveBeenCalledWith({ q: 'pri', limit: 8 });
    expect(optionNames()).toEqual(['Priya Raman', 'Create "pri"']);
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveAttribute('aria-controls', screen.getByRole('listbox').id);
  });

  it('picks the active option with the arrow keys and Enter, then clears the text', async () => {
    const { onChange } = renderField();
    const input = screen.getByRole('combobox', { name: 'People' });
    await userEvent.type(input, 'pri');
    await screen.findByRole('option', { name: 'Priya Raman' });
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}');
    expect(screen.getByRole('option', { name: 'Priya Raman' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith([
      { id: 1, display_name: 'Priya Raman', peopler_id: 42, peopler_url: 'https://peopler.example/p/42' },
    ]);
    expect(input).toHaveValue('');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Priya Raman' })).toBeInTheDocument();
  });

  it('picks an option on click', async () => {
    const { onChange } = renderField();
    const input = screen.getByRole('combobox', { name: 'People' });
    await userEvent.type(input, 'pri');
    await userEvent.click(await screen.findByRole('option', { name: 'Priya Raman' }));
    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ id: 1 })]);
    expect(input).toHaveValue('');
  });

  it('Create "Sam" creates a new person even when namesakes match, and tags the new id', async () => {
    api.getPeople.mockResolvedValue([
      makePerson({ id: 5, display_name: 'Sam Lee' }),
      makePerson({ id: 6, display_name: 'sam' }),
    ]);
    let resolveCreate: (p: unknown) => void = () => {};
    api.createPerson.mockReturnValue(new Promise((resolve) => (resolveCreate = resolve)));
    const { onChange } = renderField();
    const input = screen.getByRole('combobox', { name: 'People' });
    await userEvent.type(input, 'Sam');
    await screen.findByRole('option', { name: 'Sam Lee' });
    await userEvent.click(screen.getByRole('option', { name: 'Create "Sam"' }));
    expect(api.createPerson).toHaveBeenCalledWith({ display_name: 'Sam' });
    expect(await screen.findByRole('option', { name: 'Creating…' })).toBeInTheDocument();
    resolveCreate(makePerson({ id: 77, display_name: 'Sam' }));
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith([{ id: 77, display_name: 'Sam', peopler_id: null, peopler_url: null }])
    );
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('');
  });

  it('an option moved to before the matches load stays the one Enter picks (Create "Sam" over namesakes)', async () => {
    let resolvePeople: (rows: unknown) => void = () => {};
    api.getPeople.mockReturnValue(new Promise((resolve) => (resolvePeople = resolve)));
    api.createPerson.mockResolvedValue(makePerson({ id: 77, display_name: 'Sam' }));
    const { onChange } = renderField();
    await userEvent.type(screen.getByRole('combobox', { name: 'People' }), 'Sam');
    await waitFor(() => expect(api.getPeople).toHaveBeenCalledWith({ q: 'Sam', limit: 8 }));
    expect(optionNames()).toEqual(['Create "Sam"']);
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: 'Create "Sam"' })).toHaveAttribute('aria-selected', 'true');
    resolvePeople([makePerson({ id: 5, display_name: 'Sam Lee' }), makePerson({ id: 6, display_name: 'sam' })]);
    await screen.findByRole('option', { name: 'Sam Lee' });
    expect(screen.getByRole('option', { name: 'Create "Sam"' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Enter}');
    expect(api.createPerson).toHaveBeenCalledWith({ display_name: 'Sam' });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ id: 77 })]));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('a chip removed while a create is pending stays removed when the create lands', async () => {
    const other = makeTodoPerson({ id: 3, display_name: 'Ola Other' });
    let resolveCreate: (p: unknown) => void = () => {};
    api.createPerson.mockReturnValue(new Promise((resolve) => (resolveCreate = resolve)));
    const { onChange } = renderField({ initial: [chosen, other] });
    await userEvent.type(screen.getByRole('combobox', { name: 'People' }), 'pri');
    await userEvent.click(await screen.findByRole('option', { name: 'Create "pri"' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remove Pri Chosen' }));
    expect(onChange).toHaveBeenLastCalledWith([other]);
    resolveCreate(makePerson({ id: 77, display_name: 'pri' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(2));
    expect(onChange).toHaveBeenLastCalledWith([other, expect.objectContaining({ id: 77 })]);
  });

  it('a failed create shows the error under the field and keeps the text', async () => {
    api.createPerson.mockRejectedValue(new ApiError(400, 'VALIDATION_ERROR', 'display_name must be at most 120 characters'));
    const { onChange } = renderField();
    const input = screen.getByRole('combobox', { name: 'People' });
    await userEvent.type(input, 'pri');
    await userEvent.click(await screen.findByRole('option', { name: 'Create "pri"' }));
    expect(await screen.findByText('display_name must be at most 120 characters')).toBeInTheDocument();
    expect(input).toHaveValue('pri');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('removing a chip calls onChange without that person', async () => {
    const other = makeTodoPerson({ id: 3, display_name: 'Ola Other' });
    const { onChange } = renderField({ initial: [chosen, other] });
    await userEvent.click(screen.getByRole('button', { name: 'Remove Pri Chosen' }));
    expect(onChange).toHaveBeenCalledWith([other]);
  });

  it('at 20 chosen people the input is disabled and the limit shows', () => {
    const twenty = Array.from({ length: 20 }, (_, i) => makeTodoPerson({ id: i + 1, display_name: `Person ${i + 1}` }));
    renderField({ initial: twenty });
    expect(screen.getByRole('combobox', { name: 'People' })).toBeDisabled();
    expect(screen.getByText('Up to 20 people per todo.')).toBeInTheDocument();
  });

  it('inside a Dialog, Escape closes the open listbox only; a second Escape closes the dialog', async () => {
    const onDialogClose = vi.fn();
    renderField({ onDialogClose });
    await userEvent.type(screen.getByRole('combobox', { name: 'People' }), 'pri');
    await screen.findByRole('listbox');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onDialogClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'New todo' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(onDialogClose).toHaveBeenCalledTimes(1);
  });
});

describe('PeopleField on phones', () => {
  beforeEach(() => {
    phone.isPhone = true;
  });

  it('opens a People sheet that edits the value live, and Done closes it', async () => {
    const { onChange } = renderField({ initial: [chosen], onDialogClose: vi.fn() });
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Pri Chosen' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add people' }));
    const sheet = screen.getByRole('dialog', { name: 'People' });
    await userEvent.type(within(sheet).getByRole('combobox'), 'pri');
    await userEvent.click(await within(sheet).findByRole('option', { name: 'Priya Raman' }));
    expect(onChange).toHaveBeenLastCalledWith([chosen, expect.objectContaining({ id: 1 })]);
    expect(within(sheet).getByRole('button', { name: 'Remove Priya Raman' })).toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog', { name: 'People' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Priya Raman' })).toBeInTheDocument();
  });

  it('Escape closes the listbox, then the sheet, but not the form dialog beneath', async () => {
    const onDialogClose = vi.fn();
    renderField({ onDialogClose });
    await userEvent.click(screen.getByRole('button', { name: 'Add people' }));
    const sheet = screen.getByRole('dialog', { name: 'People' });
    await userEvent.type(within(sheet).getByRole('combobox'), 'pri');
    await within(sheet).findByRole('listbox');
    await userEvent.keyboard('{Escape}');
    expect(within(sheet).queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'People' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'People' })).not.toBeInTheDocument();
    expect(onDialogClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'New todo' })).toBeInTheDocument();
  });
});

describe('PeopleField compact', () => {
  it('renders only the combobox and appends the one picked person', async () => {
    const onChange = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <PeopleField id="compact" compact value={[chosen]} onChange={onChange} />
      </QueryClientProvider>
    );
    expect(screen.queryByText('Pri Chosen')).not.toBeInTheDocument();
    expect(screen.queryByText('optional')).not.toBeInTheDocument();
    await userEvent.type(screen.getByRole('combobox'), 'pri');
    await userEvent.click(await screen.findByRole('option', { name: 'Priya Raman' }));
    expect(onChange).toHaveBeenCalledWith([
      chosen,
      { id: 1, display_name: 'Priya Raman', peopler_id: 42, peopler_url: 'https://peopler.example/p/42' },
    ]);
  });
});
