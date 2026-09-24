import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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

describe('AccessTokenManagementModal: Connected apps', () => {
  const pat: api.AccessTokenSummary = {
    id: 1, name: 'email-webhook', scopes: ['todos:create'],
    createdAt: '2026-08-07T00:00:00Z', lastUsedAt: null, expiresAt: null, isRevoked: false,
    source: 'pat', clientId: null, clientName: null,
  };
  const claude: api.AccessTokenSummary = {
    id: 9, name: 'Claude', scopes: ['todos:read', 'todos:create'],
    createdAt: '2026-09-23T00:00:00Z', lastUsedAt: '2026-09-24T00:00:00Z',
    expiresAt: '2026-12-22T00:00:00Z', isRevoked: false,
    source: 'oauth', clientId: 'https://claude.ai/oauth/claude-client-metadata', clientName: 'Claude',
  };

  const regions = async () => ({
    apps: await screen.findByRole('region', { name: /connected apps/i }),
    tokens: screen.getByRole('region', { name: /existing tokens/i }),
  });

  beforeEach(() => {
    vi.mocked(api.listTokens).mockResolvedValue([pat, claude]);
  });

  it('lists oauth rows under Connected apps and keeps them out of the token list', async () => {
    render(<AccessTokenManagementModal isOpen onClose={() => {}} />);
    const { apps, tokens } = await regions();

    expect(await within(apps).findByText('Claude')).toBeInTheDocument();
    expect(within(apps).queryByText('email-webhook')).not.toBeInTheDocument();
    expect(within(tokens).getByText('email-webhook')).toBeInTheDocument();
    expect(within(tokens).queryByText('Claude')).not.toBeInTheDocument();
  });

  it('shows scopes, created, last used and expiry for a connection', async () => {
    render(<AccessTokenManagementModal isOpen onClose={() => {}} />);
    const { apps } = await regions();
    await within(apps).findByText('Claude');

    expect(within(apps).getByText('todos:read')).toBeInTheDocument();
    expect(within(apps).getByText('todos:create')).toBeInTheDocument();
    const d = (iso: string) => new Date(iso).toLocaleDateString();
    expect(within(apps).getByText(
      `Created ${d(claude.createdAt)} — last used ${d(claude.lastUsedAt!)} — expires ${d(claude.expiresAt!)}`
    )).toBeInTheDocument();
  });

  it('labels a connection past its hard limit as expired', async () => {
    vi.mocked(api.listTokens).mockResolvedValue([{ ...claude, expiresAt: '2020-01-01T00:00:00Z' }]);
    render(<AccessTokenManagementModal isOpen onClose={() => {}} />);
    const { apps } = await regions();

    expect(await within(apps).findByText(/expired /)).toBeInTheDocument();
  });

  it('disconnects through the existing revoke endpoint and refreshes the list', async () => {
    vi.mocked(api.revokeToken).mockResolvedValue();
    render(<AccessTokenManagementModal isOpen onClose={() => {}} />);
    const { apps } = await regions();

    await userEvent.click(await within(apps).findByRole('button', { name: /disconnect claude/i }));

    expect(api.revokeToken).toHaveBeenCalledWith(9);
    await waitFor(() => expect(api.listTokens).toHaveBeenCalledTimes(2));
  });

  it('falls back to the row name when clientName is null', async () => {
    vi.mocked(api.listTokens).mockResolvedValue([{ ...claude, name: 'Claude Code', clientName: null }]);
    render(<AccessTokenManagementModal isOpen onClose={() => {}} />);
    const { apps } = await regions();

    expect(await within(apps).findByText('Claude Code')).toBeInTheDocument();
  });

  it('treats a row with no source (backend older than the OAuth PR) as a PAT', async () => {
    const legacy = { ...pat, id: 3, name: 'legacy' } as Partial<api.AccessTokenSummary>;
    delete legacy.source;
    vi.mocked(api.listTokens).mockResolvedValue([legacy as api.AccessTokenSummary]);
    render(<AccessTokenManagementModal isOpen onClose={() => {}} />);
    const { apps, tokens } = await regions();

    expect(await within(tokens).findByText('legacy')).toBeInTheDocument();
    expect(within(apps).getByText(/no apps are connected/i)).toBeInTheDocument();
  });

  it('leaves the create form unchanged when connections exist', async () => {
    render(<AccessTokenManagementModal isOpen onClose={() => {}} />);
    await regions();

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(10);
    expect(screen.getByRole('button', { name: /create token/i })).toBeInTheDocument();
  });
});
