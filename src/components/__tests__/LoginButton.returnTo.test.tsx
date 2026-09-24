import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import LoginButton from '../LoginButton';
import { useAuth } from '../../contexts/AuthContext';

// Characterization: pins the behaviour /oauth/consent relies on for
// return-to. Passkey sign-in must RELOAD the current URL (keeping
// ?request=<id>), never navigate to a fixed path such as '/'.

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

let capturedOnSuccess: (() => void) | null = null;
vi.mock('../PasskeyLoginButton', () => ({
  default: ({ onSuccess }: { onSuccess: () => void }) => {
    capturedOnSuccess = onSuccess;
    return <div>passkey-button</div>;
  },
}));

describe('LoginButton return-to behaviour', () => {
  it('reloads the current URL after passkey sign-in instead of navigating away', () => {
    const reload = vi.fn();
    const assign = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, href: 'http://localhost:5173/oauth/consent?request=req-1', reload, assign },
      writable: true,
    });
    vi.mocked(useAuth).mockReturnValue({ isGoogleReady: false, login: vi.fn() } as unknown as ReturnType<typeof useAuth>);

    render(<LoginButton />);
    expect(capturedOnSuccess).not.toBeNull();
    capturedOnSuccess!();

    expect(reload).toHaveBeenCalledTimes(1);
    expect(assign).not.toHaveBeenCalled();
  });
});
