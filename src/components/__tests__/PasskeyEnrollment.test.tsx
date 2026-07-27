import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasskeyEnrollment from '../PasskeyEnrollment';
import * as passkeyApi from '../../services/passkeyApi';
import type { PasskeySummary } from '../../services/passkeyApi';

// Mock the passkey API entirely -- this pulls in @simplewebauthn/browser in
// the real module, and we never want a real WebAuthn ceremony in a test.
vi.mock('../../services/passkeyApi');

const mockPasskey = (overrides: Partial<PasskeySummary> = {}): PasskeySummary => ({
  id: 1,
  credentialId: 'credential-id-0123456789abcdef',
  nickname: 'MacBook Touch ID',
  createdAt: '2026-01-01T00:00:00.000Z',
  lastUsedAt: '2026-01-15T00:00:00.000Z',
  ...overrides,
});

describe('PasskeyEnrollment', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetAllMocks();
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'prompt').mockReturnValue('This device');
  });

  it('renders the empty state when the list is empty', async () => {
    vi.mocked(passkeyApi.listPasskeys).mockResolvedValue([]);

    render(<PasskeyEnrollment />);

    expect(await screen.findByText(/no passkeys enrolled yet/i)).toBeInTheDocument();
  });

  it('renders a fetched list showing nickname and last-used information', async () => {
    vi.mocked(passkeyApi.listPasskeys).mockResolvedValue([
      mockPasskey({ nickname: 'MacBook Touch ID', lastUsedAt: '2026-01-15T00:00:00.000Z' }),
    ]);

    render(<PasskeyEnrollment />);

    expect(await screen.findByText(/macbook touch id/i)).toBeInTheDocument();
    expect(screen.getByText(/last used/i)).toBeInTheDocument();
  });

  it('add flow calls enrollPasskey and then refreshes the list', async () => {
    vi.mocked(passkeyApi.listPasskeys)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([mockPasskey()]);
    vi.mocked(passkeyApi.enrollPasskey).mockResolvedValue({ credentialId: 'abc' });

    render(<PasskeyEnrollment />);
    await screen.findByText(/no passkeys enrolled yet/i);

    await userEvent.click(screen.getByRole('button', { name: /add a passkey/i }));

    await waitFor(() => expect(passkeyApi.enrollPasskey).toHaveBeenCalledTimes(1));
    expect(passkeyApi.listPasskeys).toHaveBeenCalledTimes(2);
    expect(await screen.findByText(/macbook touch id/i)).toBeInTheDocument();
  });

  it('remove flow calls deletePasskey and then refreshes the list', async () => {
    const passkey = mockPasskey({ id: 7 });
    vi.mocked(passkeyApi.listPasskeys)
      .mockResolvedValueOnce([passkey])
      .mockResolvedValueOnce([]);
    vi.mocked(passkeyApi.deletePasskey).mockResolvedValue(undefined);

    render(<PasskeyEnrollment />);
    await screen.findByText(/macbook touch id/i);

    await userEvent.click(screen.getByRole('button', { name: /remove/i }));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(passkeyApi.deletePasskey).toHaveBeenCalledWith(7));
    expect(passkeyApi.listPasskeys).toHaveBeenCalledTimes(2);
    expect(await screen.findByText(/no passkeys enrolled yet/i)).toBeInTheDocument();
  });

  it('shows error text when the initial list fetch fails', async () => {
    vi.mocked(passkeyApi.listPasskeys).mockRejectedValue(new Error('Network error'));

    render(<PasskeyEnrollment />);

    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });

  it('shows error text when enrollment fails, without crashing', async () => {
    vi.mocked(passkeyApi.listPasskeys).mockResolvedValue([]);
    vi.mocked(passkeyApi.enrollPasskey).mockRejectedValue(new Error('Enrollment declined'));

    render(<PasskeyEnrollment />);
    await screen.findByText(/no passkeys enrolled yet/i);

    await userEvent.click(screen.getByRole('button', { name: /add a passkey/i }));

    expect(await screen.findByText(/enrollment declined/i)).toBeInTheDocument();
  });

  it('shows error text when removal fails, without crashing', async () => {
    vi.mocked(passkeyApi.listPasskeys).mockResolvedValue([mockPasskey()]);
    vi.mocked(passkeyApi.deletePasskey).mockRejectedValue(
      new Error('Could not remove passkey')
    );

    render(<PasskeyEnrollment />);
    await screen.findByText(/macbook touch id/i);

    await userEvent.click(screen.getByRole('button', { name: /remove/i }));

    expect(await screen.findByText(/could not remove passkey/i)).toBeInTheDocument();
  });

  it('does not call deletePasskey when the user declines the confirmation', async () => {
    confirmSpy.mockReturnValue(false);
    vi.mocked(passkeyApi.listPasskeys).mockResolvedValue([mockPasskey()]);

    render(<PasskeyEnrollment />);
    await screen.findByText(/macbook touch id/i);

    await userEvent.click(screen.getByRole('button', { name: /remove/i }));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(passkeyApi.deletePasskey).not.toHaveBeenCalled();
  });

  it('guards against a second concurrent delete on the same passkey', async () => {
    let resolveDelete!: () => void;
    vi.mocked(passkeyApi.listPasskeys).mockResolvedValue([mockPasskey({ id: 3 })]);
    vi.mocked(passkeyApi.deletePasskey).mockReturnValue(
      new Promise<void>(r => { resolveDelete = r; })
    );

    render(<PasskeyEnrollment />);
    await screen.findByText(/macbook touch id/i);

    const removeButton = screen.getByRole('button', { name: /remove/i });

    // Dispatch two raw click events inside a single `act(...)` batch. React
    // does not flush the `disabled` state update to the real DOM node until
    // the outermost `act()` call unwinds, so both events reach the button's
    // onClick handler while the DOM attribute is still `disabled=false` --
    // the same way two genuinely simultaneous activations (e.g. a
    // double-click landing inside one input batch) would. This means the
    // only thing standing between the two `handleRemove` invocations is the
    // `removingIdsRef` guard itself, not the disabled attribute. Verified by
    // deleting the guard line and watching this assertion fail (see the fix
    // report addendum).
    act(() => {
      removeButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      removeButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(passkeyApi.deletePasskey).toHaveBeenCalledTimes(1);

    resolveDelete();
    await waitFor(() => expect(removeButton).not.toBeDisabled());
  });
});
