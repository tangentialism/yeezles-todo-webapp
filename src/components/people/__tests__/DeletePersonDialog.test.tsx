import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '../../../services/apiError';
import { makePerson } from '../../../test/personFactories';

const api = vi.hoisted(() => ({ deletePerson: vi.fn() }));
vi.mock('../../../hooks/useApi', () => ({ useApi: () => api }));
vi.mock('../../../hooks/useCrossTabSync', () => ({ useCrossTabSync: () => ({ broadcast: vi.fn() }) }));

import DeletePersonDialog from '../DeletePersonDialog';

const priya = makePerson({ id: 4, display_name: 'Priya Raman', open_count: 3, done_count: 2 });

const renderDialog = () => {
  const handlers = { onClose: vi.fn(), onDeleted: vi.fn() };
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DeletePersonDialog person={priya} {...handlers} />
    </QueryClientProvider>
  );
  return handlers;
};

beforeEach(() => {
  vi.clearAllMocks();
  api.deletePerson.mockResolvedValue(undefined);
});

describe('DeletePersonDialog', () => {
  it('confirms with N as open plus done', () => {
    renderDialog();
    expect(
      screen.getByText('Delete "Priya Raman"? Their tags are removed from 5 todos; the todos stay.')
    ).toBeInTheDocument();
  });

  it('deletes then calls onDeleted', async () => {
    const { onDeleted } = renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Delete person' }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(api.deletePerson).toHaveBeenCalledWith(4);
  });

  it('shows the error and stays open when the delete fails', async () => {
    api.deletePerson.mockRejectedValue(new ApiError(404, 'PERSON_NOT_FOUND', 'Person not found'));
    const { onDeleted } = renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Delete person' }));
    expect(await screen.findByText('Person not found')).toBeInTheDocument();
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
