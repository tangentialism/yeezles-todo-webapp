import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { ApiError } from '../../../services/apiError';
import { makePerson, makeTodoPerson } from '../../../test/personFactories';
import type { Todo } from '../../../types/todo';

const api = vi.hoisted(() => ({ updatePerson: vi.fn(), getTodos: vi.fn() }));
vi.mock('../../../hooks/useApi', () => ({ useApi: () => api }));
vi.mock('../../../hooks/useCrossTabSync', () => ({ useCrossTabSync: () => ({ broadcast: vi.fn() }) }));
vi.mock('../../TodoActions', () => ({ default: () => null }));
vi.mock('../../TodayToggle', () => ({ default: () => null }));

import EditPersonDialog from '../EditPersonDialog';
import TodoRow from '../../TodoRow';

const priya = makePerson({ id: 1, display_name: 'Priya Raman', aliases: ['PR', 'Pri'] });

const renderDialog = (onClose = vi.fn(), client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) => {
  render(
    <QueryClientProvider client={client}>
      <EditPersonDialog person={priya} onClose={onClose} />
    </QueryClientProvider>
  );
  return { onClose, client };
};

const nameField = () => screen.getByLabelText('Name');
const aliasField = () => screen.getByLabelText(/Aliases/);
const save = () => userEvent.click(screen.getByRole('button', { name: 'Save' }));
const replace = async (el: HTMLElement, text: string) => {
  await userEvent.clear(el);
  if (text) {
    await userEvent.click(el);
    await userEvent.paste(text);
  }
};

beforeEach(() => {
  vi.clearAllMocks();
  api.updatePerson.mockResolvedValue({ ...priya });
});

describe('EditPersonDialog', () => {
  it('prefills the name and one alias per line', () => {
    renderDialog();
    expect(nameField()).toHaveValue('Priya Raman');
    expect(aliasField()).toHaveValue('PR\nPri');
  });

  it('sends only display_name for a rename, trimmed, and closes on success', async () => {
    const { onClose } = renderDialog();
    await replace(nameField(), '  Priya R.  ');
    await save();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.updatePerson).toHaveBeenCalledWith(1, { display_name: 'Priya R.' });
  });

  it('sends only aliases for an alias-only edit, dropping blank lines and trimming', async () => {
    const { onClose } = renderDialog();
    await replace(aliasField(), '  PR  \n\n  Priya  \n   \n');
    await save();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.updatePerson).toHaveBeenCalledWith(1, { aliases: ['PR', 'Priya'] });
  });

  it('sends an empty aliases array when every line is cleared', async () => {
    renderDialog();
    await replace(aliasField(), '');
    await save();
    await waitFor(() => expect(api.updatePerson).toHaveBeenCalledWith(1, { aliases: [] }));
  });

  it('closes without a request when nothing changed', async () => {
    const { onClose } = renderDialog();
    await save();
    expect(onClose).toHaveBeenCalled();
    expect(api.updatePerson).not.toHaveBeenCalled();
  });

  it('blocks a blank name with no request', async () => {
    const { onClose } = renderDialog();
    await replace(nameField(), '   ');
    await save();
    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(api.updatePerson).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('blocks a 121-character name but allows 120', async () => {
    renderDialog();
    await replace(nameField(), 'x'.repeat(121));
    await save();
    expect(screen.getByText('Name can be at most 120 characters.')).toBeInTheDocument();
    expect(api.updatePerson).not.toHaveBeenCalled();
    await replace(nameField(), 'x'.repeat(120));
    await save();
    await waitFor(() => expect(api.updatePerson).toHaveBeenCalledWith(1, { display_name: 'x'.repeat(120) }));
  });

  it('blocks an alias over 120 characters and more than 20 aliases', async () => {
    renderDialog();
    await replace(aliasField(), 'y'.repeat(121));
    await save();
    expect(screen.getByText('Each alias can be at most 120 characters.')).toBeInTheDocument();
    await replace(aliasField(), Array.from({ length: 21 }, (_, i) => `a${i}`).join('\n'));
    await save();
    expect(screen.getByText('At most 20 aliases.')).toBeInTheDocument();
    expect(api.updatePerson).not.toHaveBeenCalled();
  });

  it('shows a server VALIDATION_ERROR inline and stays open', async () => {
    api.updatePerson.mockRejectedValue(new ApiError(400, 'VALIDATION_ERROR', 'display_name is too long'));
    const { onClose } = renderDialog();
    await replace(nameField(), 'Priya R.');
    await save();
    expect(await screen.findByText('display_name is too long')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  // Review focus 1 (local): the rename must invalidate ['todos'] so mounted rows pick up the name.
  it('a mounted TodoRow shows the new name once its todos query refetches after a rename', async () => {
    const todo = (name: string): Todo => ({
      id: 7, title: 'Order tiles', description: '', completed: false, due_date: null, is_today: false, area_id: null,
      reference_url: null, created_at: '', updated_at: '', completed_at: null,
      people: [makeTodoPerson({ id: 1, display_name: name })],
    });
    api.getTodos.mockResolvedValueOnce({ success: true, data: [todo('Priya Raman')] });
    api.getTodos.mockResolvedValue({ success: true, data: [todo('Priya R.')] });
    const Probe = () => {
      const { data } = useQuery({ queryKey: ['todos', {}], queryFn: () => api.getTodos() });
      return (
        <>
          {data?.data.map((t: Todo) => (
            <TodoRow key={t.id} todo={t} displayState={{ completed: false }} onToggleComplete={vi.fn()} onEdit={vi.fn()} onUpdate={vi.fn()} />
          ))}
        </>
      );
    };
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <Probe />
        <EditPersonDialog person={priya} onClose={vi.fn()} />
      </QueryClientProvider>
    );
    expect(await screen.findByText('Priya Raman', { selector: 'span' })).toBeInTheDocument();
    await replace(nameField(), 'Priya R.');
    await save();
    expect(await screen.findByText('Priya R.', { selector: 'span' })).toBeInTheDocument();
    expect(api.getTodos).toHaveBeenCalledTimes(2);
  });
});
