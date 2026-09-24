import { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import OAuthConsentPage from '../OAuthConsentPage';
import * as api from '../../services/oauthConsentApi';
import { OAuthConsentError, type ConsentRequestDetails } from '../../services/oauthConsentApi';

vi.mock('../../services/oauthConsentApi', async importOriginal => {
  const actual = await importOriginal<typeof import('../../services/oauthConsentApi')>();
  return {
    ...actual,
    getConsentRequest: vi.fn(),
    approveConsent: vi.fn(),
    denyConsent: vi.fn(),
  };
});

const DETAILS: ConsentRequestDetails = {
  requestId: 'req-1',
  clientId: 'https://claude.ai/oauth/claude-client-metadata',
  clientName: 'Claude',
  redirectHost: 'claude.ai',
  isLoopback: false,
  requestedScopes: ['todos:read', 'todos:create'],
  scopeDescriptions: { 'todos:read': 'See your todos', 'todos:create': 'Create todos' },
  expiresAt: '2026-09-23T12:10:00Z',
  passkeyOptions: {
    challenge: 'chal-1',
    rpId: 'yeezlestodo.com',
    allowCredentials: [{ id: 'cred-1', type: 'public-key' }],
  },
};

const APPROVE_REDIRECT = 'https://claude.ai/api/mcp/auth_callback?code=abc&state=xyz&iss=x';
const DENY_REDIRECT = 'https://claude.ai/api/mcp/auth_callback?error=access_denied&state=xyz&iss=x';

let assign: ReturnType<typeof vi.fn>;

function renderPage(url = '/oauth/consent?request=req-1') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <OAuthConsentPage />
    </MemoryRouter>
  );
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('OAuthConsentPage', () => {
  beforeEach(() => {
    assign = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign },
      writable: true,
    });
    vi.mocked(api.getConsentRequest).mockReset().mockResolvedValue(DETAILS);
    vi.mocked(api.approveConsent).mockReset().mockResolvedValue(APPROVE_REDIRECT);
    vi.mocked(api.denyConsent).mockReset().mockResolvedValue(DENY_REDIRECT);
  });

  it('loads the request named in the URL and shows the client and redirect host', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: /claude wants to access/i })).toBeInTheDocument();
    expect(api.getConsentRequest).toHaveBeenCalledWith('req-1');
    expect(screen.getByText(/will redirect to/i)).toHaveTextContent('Will redirect to claude.ai');
  });

  it('ticks every requested scope by default, labelled by its description', async () => {
    renderPage();

    const read = await screen.findByRole('checkbox', { name: /see your todos/i });
    const create = screen.getByRole('checkbox', { name: /create todos/i });
    expect(read).toBeChecked();
    expect(create).toBeChecked();
  });

  it('falls back to the scope name when the backend sends no description', async () => {
    vi.mocked(api.getConsentRequest).mockResolvedValue({
      ...DETAILS,
      scopeDescriptions: { 'todos:read': 'See your todos' },
    });
    renderPage();

    expect(await screen.findByRole('checkbox', { name: /todos:create/ })).toBeChecked();
  });

  it('warns prominently when the redirect is loopback, and not otherwise', async () => {
    const { unmount } = renderPage();
    await screen.findByRole('heading', { name: /claude wants to access/i });
    expect(screen.queryByRole('note', { name: /loopback warning/i })).not.toBeInTheDocument();
    unmount();

    vi.mocked(api.getConsentRequest).mockResolvedValue({
      ...DETAILS, redirectHost: 'localhost', isLoopback: true,
    });
    renderPage();
    const warning = await screen.findByRole('note', { name: /loopback warning/i });
    expect(warning).toHaveTextContent(/runs on your own computer/i);
    expect(warning).toHaveTextContent('localhost');
  });

  it('disables Approve when no scope is ticked', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('checkbox', { name: /see your todos/i }));
    await user.click(screen.getByRole('checkbox', { name: /create todos/i }));

    expect(screen.getByRole('button', { name: /approve/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /deny/i })).toBeEnabled();
  });

  it('approves only the ticked scopes, in requested order, then assigns redirectTo without rendering it', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();

    await user.click(await screen.findByRole('checkbox', { name: /create todos/i }));
    await user.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith(APPROVE_REDIRECT));
    expect(api.approveConsent).toHaveBeenCalledWith(DETAILS, ['todos:read']);
    expect(container.querySelector('a')).toBeNull();
    expect(container.innerHTML).not.toContain('code=abc');
  });

  it('denies without a passkey and assigns the deny redirect', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /deny/i }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith(DENY_REDIRECT));
    expect(api.denyConsent).toHaveBeenCalledWith(DETAILS);
    expect(api.approveConsent).not.toHaveBeenCalled();
  });

  it('submits once however fast Approve is clicked, and ignores Deny meanwhile', async () => {
    const user = userEvent.setup();
    const pending = deferred<string>();
    vi.mocked(api.approveConsent).mockReturnValue(pending.promise);
    renderPage();

    const approve = await screen.findByRole('button', { name: /approve/i });
    await user.dblClick(approve);
    await user.click(screen.getByRole('button', { name: /deny/i }));

    expect(api.approveConsent).toHaveBeenCalledTimes(1);
    expect(api.denyConsent).not.toHaveBeenCalled();
    pending.resolve(APPROVE_REDIRECT);
    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1));
  });

  it('shows an error and never navigates when the redirect fails its check', async () => {
    const user = userEvent.setup();
    vi.mocked(api.approveConsent).mockRejectedValue(
      new OAuthConsentError('UNEXPECTED_REDIRECT', 'The server returned an unexpected redirect')
    );
    renderPage();

    await user.click(await screen.findByRole('button', { name: /approve/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/unexpected destination/i);
    expect(assign).not.toHaveBeenCalled();
  });

  it('makes no request when the URL has no request id', async () => {
    renderPage('/oauth/consent');

    expect(await screen.findByRole('alert')).toHaveTextContent(/missing its request/i);
    expect(api.getConsentRequest).not.toHaveBeenCalled();
  });

  it('uses only the newest response when StrictMode fetches twice and they arrive out of order', async () => {
    const user = userEvent.setup();
    const first = deferred<ConsentRequestDetails>();
    const second = deferred<ConsentRequestDetails>();
    vi.mocked(api.getConsentRequest)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/oauth/consent?request=req-1']}>
          <OAuthConsentPage />
        </MemoryRouter>
      </StrictMode>
    );
    await waitFor(() => expect(api.getConsentRequest).toHaveBeenCalledTimes(2));

    const fresh = { ...DETAILS, passkeyOptions: { ...DETAILS.passkeyOptions, challenge: 'chal-new' } };
    second.resolve(fresh);
    await screen.findByRole('heading', { name: /claude wants to access/i });
    first.resolve({ ...DETAILS, passkeyOptions: { ...DETAILS.passkeyOptions, challenge: 'chal-stale' } });

    await user.click(screen.getByRole('button', { name: /approve/i }));
    await waitFor(() => expect(api.approveConsent).toHaveBeenCalled());
    expect(vi.mocked(api.approveConsent).mock.calls[0][0].passkeyOptions.challenge).toBe('chal-new');
  });
});
