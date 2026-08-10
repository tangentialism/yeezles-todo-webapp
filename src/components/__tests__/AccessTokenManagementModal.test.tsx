import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccessTokenManagementModal from '../AccessTokenManagementModal';
import * as api from '../../services/accessTokenApi';

vi.mock('../../services/accessTokenApi');

describe('AccessTokenManagementModal', () => {
  beforeEach(() => {
    vi.mocked(api.listTokens).mockResolvedValue([
      { id: 1, name: 'email-webhook', scopes: ['todos:create'],
        createdAt: '2026-08-07T00:00:00Z', lastUsedAt: null,
        expiresAt: null, isRevoked: false },
    ]);
  });

  it('renders nothing when closed', () => {
    const { container } = render(<AccessTokenManagementModal isOpen={false} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists existing tokens', async () => {
    render(<AccessTokenManagementModal isOpen onClose={() => {}} />);
    expect(await screen.findByText('email-webhook')).toBeInTheDocument();
    expect(screen.getByText('todos:create')).toBeInTheDocument();
  });

  it('shows the plaintext once after creation, and warns', async () => {
    vi.mocked(api.createToken).mockResolvedValue({
      token: 'yzt_' + 'a'.repeat(64) + ':' + 'b'.repeat(64),
      id: 2, name: 'new', scopes: ['todos:create'],
      createdAt: '2026-08-07T00:00:00Z', expiresAt: null,
    });

    render(<AccessTokenManagementModal isOpen onClose={() => {}} />);
    await userEvent.type(await screen.findByLabelText(/name/i), 'new');
    await userEvent.click(screen.getByLabelText('todos:create'));
    await userEvent.click(screen.getByRole('button', { name: /create token/i }));

    expect(await screen.findByText(/yzt_a{10}/)).toBeInTheDocument();
    expect(screen.getByText(/only time you will see this/i)).toBeInTheDocument();
  });

  it('discards the plaintext when the reveal is dismissed', async () => {
    vi.mocked(api.createToken).mockResolvedValue({
      token: 'yzt_' + 'a'.repeat(64) + ':' + 'b'.repeat(64),
      id: 2, name: 'new', scopes: ['todos:create'],
      createdAt: '2026-08-07T00:00:00Z', expiresAt: null,
    });

    render(<AccessTokenManagementModal isOpen onClose={() => {}} />);
    await userEvent.type(await screen.findByLabelText(/name/i), 'new');
    await userEvent.click(screen.getByLabelText('todos:create'));
    await userEvent.click(screen.getByRole('button', { name: /create token/i }));
    await userEvent.click(await screen.findByRole('button', { name: /done/i }));

    await waitFor(() => {
      expect(screen.queryByText(/yzt_a{10}/)).not.toBeInTheDocument();
    });
  });

  it('discards the plaintext when dismissed via the X button and reopened', async () => {
    vi.mocked(api.createToken).mockResolvedValue({
      token: 'yzt_' + 'a'.repeat(64) + ':' + 'b'.repeat(64),
      id: 2, name: 'new', scopes: ['todos:create'],
      createdAt: '2026-08-07T00:00:00Z', expiresAt: null,
    });

    const onClose = vi.fn();
    const { rerender, container } = render(
      <AccessTokenManagementModal isOpen onClose={onClose} />
    );
    await userEvent.type(await screen.findByLabelText(/name/i), 'new');
    await userEvent.click(screen.getByLabelText('todos:create'));
    await userEvent.click(screen.getByRole('button', { name: /create token/i }));

    expect(await screen.findByText(/yzt_a{10}/)).toBeInTheDocument();

    // Dismiss via the X button (no accessible name -- same chrome as
    // PasskeyManagementModal), not Done. The component is never unmounted:
    // Dashboard mounts this modal unconditionally and only toggles `isOpen`.
    const closeButton = container.querySelector('svg')?.closest('button');
    expect(closeButton).not.toBeNull();
    await userEvent.click(closeButton!);
    expect(onClose).toHaveBeenCalled();

    rerender(<AccessTokenManagementModal isOpen={false} onClose={onClose} />);
    rerender(<AccessTokenManagementModal isOpen onClose={onClose} />);

    await waitFor(() => {
      expect(screen.queryByText(/yzt_a{10}/)).not.toBeInTheDocument();
    });
  });

  it('revokes a token', async () => {
    vi.mocked(api.revokeToken).mockResolvedValue();
    render(<AccessTokenManagementModal isOpen onClose={() => {}} />);
    await userEvent.click(await screen.findByRole('button', { name: /revoke/i }));
    expect(api.revokeToken).toHaveBeenCalledWith(1);
  });
});
