import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasskeyLoginButton from '../PasskeyLoginButton';
import * as passkeyApi from '../../services/passkeyApi';

describe('PasskeyLoginButton', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls onSuccess after a successful ceremony', async () => {
    vi.spyOn(passkeyApi, 'loginWithPasskey').mockResolvedValue({
      email: 'a@example.com', name: 'A',
    });
    const onSuccess = vi.fn();

    render(<PasskeyLoginButton onSuccess={onSuccess} />);
    await userEvent.click(screen.getByRole('button', { name: /passkey/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it('shows an error message when the ceremony fails', async () => {
    vi.spyOn(passkeyApi, 'loginWithPasskey').mockRejectedValue(
      new Error('Unknown credential')
    );

    render(<PasskeyLoginButton onSuccess={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /passkey/i }));

    expect(await screen.findByText(/unknown credential/i)).toBeInTheDocument();
  });

  it('disables the button while the ceremony is in flight', async () => {
    let resolve!: (v: { email: string; name: string }) => void;
    vi.spyOn(passkeyApi, 'loginWithPasskey').mockReturnValue(
      new Promise(r => { resolve = r; })
    );

    render(<PasskeyLoginButton onSuccess={vi.fn()} />);
    const button = screen.getByRole('button', { name: /passkey/i });
    await userEvent.click(button);

    expect(button).toBeDisabled();
    resolve({ email: 'a@example.com', name: 'A' });
  });
});
