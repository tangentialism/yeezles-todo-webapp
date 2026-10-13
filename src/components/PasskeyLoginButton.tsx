import React, { useState } from 'react';
import { loginWithPasskey } from '../services/passkeyApi';

interface PasskeyLoginButtonProps {
  onSuccess: () => void;
}

/**
 * Usernameless passkey sign-in. There is no email field by design: the
 * authenticator offers any discoverable credential for this domain.
 */
const PasskeyLoginButton: React.FC<PasskeyLoginButtonProps> = ({ onSuccess }) => {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setIsBusy(true);
    setError(null);
    try {
      await loginWithPasskey();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isBusy}
        className="w-[280px] py-3 px-6 rounded-md bg-ink text-white font-medium hover:bg-ink-2 disabled:opacity-60"
      >
        {isBusy ? 'Waiting for passkey...' : 'Sign in with a passkey'}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
};

export default PasskeyLoginButton;
