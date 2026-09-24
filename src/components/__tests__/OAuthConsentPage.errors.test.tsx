import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import OAuthConsentPage from '../OAuthConsentPage';
import * as api from '../../services/oauthConsentApi';
import {
  OAuthConsentError,
  type ConsentRequestDetails,
  type OAuthConsentErrorCode,
} from '../../services/oauthConsentApi';

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

const fail = (code: OAuthConsentErrorCode) => new OAuthConsentError(code, `raw ${code}`);

let assign: ReturnType<typeof vi.fn>;

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/oauth/consent?request=req-1']}>
      <OAuthConsentPage />
    </MemoryRouter>
  );
}

describe('OAuthConsentPage error states', () => {
  beforeEach(() => {
    assign = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign },
      writable: true,
    });
    vi.mocked(api.getConsentRequest).mockReset().mockResolvedValue(DETAILS);
    vi.mocked(api.approveConsent).mockReset();
    vi.mocked(api.denyConsent).mockReset();
  });

  it('REQUEST_NOT_FOUND on load: says start again from Claude, offers no buttons', async () => {
    vi.mocked(api.getConsentRequest).mockRejectedValue(fail('REQUEST_NOT_FOUND'));
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This request expired or was already used. Start again from Claude.'
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('REQUEST_NOT_FOUND on approve (expired while open): same terminal message, no refetch', async () => {
    const user = userEvent.setup();
    vi.mocked(api.approveConsent).mockRejectedValue(fail('REQUEST_NOT_FOUND'));
    renderPage();

    await user.click(await screen.findByRole('button', { name: /approve/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/start again from claude/i);
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
    expect(api.getConsentRequest).toHaveBeenCalledTimes(1);
  });

  it('UNAUTHENTICATED on load: offers passkey sign-in in place', async () => {
    vi.mocked(api.getConsentRequest).mockRejectedValue(fail('UNAUTHENTICATED'));
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(/needs a passkey sign-in/i);
    expect(screen.getByRole('button', { name: /sign in with a passkey/i })).toBeInTheDocument();
  });

  it('ORIGIN_MISMATCH on approve: terminal, no retry', async () => {
    const user = userEvent.setup();
    vi.mocked(api.approveConsent).mockRejectedValue(fail('ORIGIN_MISMATCH'));
    renderPage();

    await user.click(await screen.findByRole('button', { name: /approve/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/did not accept this page/i);
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });

  it('PASSKEY_INVALID: refetches fresh options, keeps the ticks, and the retry uses the fresh challenge', async () => {
    const user = userEvent.setup();
    const fresh = { ...DETAILS, passkeyOptions: { ...DETAILS.passkeyOptions, challenge: 'chal-2' } };
    vi.mocked(api.getConsentRequest)
      .mockResolvedValueOnce(DETAILS)
      .mockResolvedValueOnce(fresh);
    vi.mocked(api.approveConsent)
      .mockRejectedValueOnce(fail('PASSKEY_INVALID'))
      .mockResolvedValueOnce('https://claude.ai/cb?code=abc');
    renderPage();

    await user.click(await screen.findByRole('checkbox', { name: /create todos/i }));
    await user.click(screen.getByRole('button', { name: /approve/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "The passkey check didn't go through (it may have timed out). Try again."
    );
    await waitFor(() => expect(api.getConsentRequest).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole('button', { name: /approve/i })).toBeEnabled());
    expect(screen.getByRole('checkbox', { name: /create todos/i })).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://claude.ai/cb?code=abc'));
    const [retryDetails, retryScopes] = vi.mocked(api.approveConsent).mock.calls[1];
    expect(retryDetails.passkeyOptions.challenge).toBe('chal-2');
    expect(retryScopes).toEqual(['todos:read']);
  });

  it('PASSKEY_CANCELLED: says so and allows another attempt', async () => {
    const user = userEvent.setup();
    vi.mocked(api.approveConsent).mockRejectedValue(fail('PASSKEY_CANCELLED'));
    renderPage();

    await user.click(await screen.findByRole('button', { name: /approve/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/cancelled or did not finish/i);
    await waitFor(() => expect(screen.getByRole('button', { name: /approve/i })).toBeEnabled());
  });

  it('INVALID_SCOPES: asks for at least one permission and allows another attempt', async () => {
    const user = userEvent.setup();
    vi.mocked(api.approveConsent).mockRejectedValue(fail('INVALID_SCOPES'));
    renderPage();

    await user.click(await screen.findByRole('button', { name: /approve/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/choose at least one permission/i);
    await waitFor(() => expect(screen.getByRole('button', { name: /approve/i })).toBeEnabled());
  });

  it('NETWORK on load: offers Try again, which reloads the request', async () => {
    const user = userEvent.setup();
    vi.mocked(api.getConsentRequest)
      .mockRejectedValueOnce(fail('NETWORK'))
      .mockResolvedValueOnce(DETAILS);
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach the server/i);
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByRole('heading', { name: /claude wants to access/i })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('NETWORK on deny: shows the error, re-enables Deny, does not refetch', async () => {
    const user = userEvent.setup();
    vi.mocked(api.denyConsent).mockRejectedValue(fail('NETWORK'));
    renderPage();

    await user.click(await screen.findByRole('button', { name: /deny/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach the server/i);
    expect(screen.getByRole('button', { name: /deny/i })).toBeEnabled();
    expect(api.getConsentRequest).toHaveBeenCalledTimes(1);
    expect(assign).not.toHaveBeenCalled();
  });

  it('an error that is not an OAuthConsentError is shown generically, never raw', async () => {
    const user = userEvent.setup();
    vi.mocked(api.approveConsent).mockRejectedValue(new Error('<script>raw</script>'));
    renderPage();

    await user.click(await screen.findByRole('button', { name: /approve/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Try again.');
    expect(document.body.innerHTML).not.toContain('raw</script>');
  });

  it('no passkey enrolled (empty allowCredentials): says to add one, offers no Approve, keeps Deny', async () => {
    vi.mocked(api.getConsentRequest).mockResolvedValue({
      ...DETAILS,
      passkeyOptions: { ...DETAILS.passkeyOptions, allowCredentials: [] },
    });
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(/no passkey on this account yet/i);
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /deny/i })).toBeEnabled();
    expect(api.approveConsent).not.toHaveBeenCalled();
  });

  it('retry refetch fails REQUEST_NOT_FOUND: ends the page', async () => {
    const user = userEvent.setup();
    vi.mocked(api.getConsentRequest)
      .mockResolvedValueOnce(DETAILS)
      .mockRejectedValueOnce(fail('REQUEST_NOT_FOUND'));
    vi.mocked(api.approveConsent).mockRejectedValue(fail('PASSKEY_INVALID'));
    renderPage();

    await user.click(await screen.findByRole('button', { name: /approve/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This request expired or was already used. Start again from Claude.'
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('retry refetch fails NETWORK: no Approve on the stale challenge, offers Try again', async () => {
    const user = userEvent.setup();
    const fresh = { ...DETAILS, passkeyOptions: { ...DETAILS.passkeyOptions, challenge: 'chal-3' } };
    vi.mocked(api.getConsentRequest)
      .mockResolvedValueOnce(DETAILS)
      .mockRejectedValueOnce(fail('NETWORK'))
      .mockResolvedValueOnce(fresh);
    vi.mocked(api.approveConsent).mockRejectedValue(fail('PASSKEY_INVALID'));
    renderPage();

    await user.click(await screen.findByRole('button', { name: /approve/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach the server/i);
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
    const tryAgain = screen.getByRole('button', { name: /try again/i });

    await user.click(tryAgain);

    expect(await screen.findByRole('button', { name: /approve/i })).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('Try again after a failed retry refetch keeps the user\'s unticked scopes, does not re-tick them', async () => {
    const user = userEvent.setup();
    vi.mocked(api.getConsentRequest)
      .mockResolvedValueOnce(DETAILS) // initial load
      .mockRejectedValueOnce(fail('NETWORK')) // refetch after the failed approve
      .mockResolvedValueOnce(DETAILS); // "Try again"
    vi.mocked(api.approveConsent).mockRejectedValue(fail('PASSKEY_INVALID'));
    renderPage();

    await user.click(await screen.findByRole('checkbox', { name: /create todos/i }));
    await user.click(screen.getByRole('button', { name: /approve/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach the server/i);
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByRole('checkbox', { name: /see your todos/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /create todos/i })).not.toBeChecked();
  });
});
