import React, { useState } from 'react';
import { loginWithPasskey } from '../services/passkeyApi';
import { KeyIcon, Spinner } from './ui/Icons';

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
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isBusy}
        className="inline-flex w-full items-center justify-center gap-2.5 h-11 px-5 rounded-full bg-ink text-paper text-[14.5px] font-medium hover:bg-ink-2 disabled:opacity-70 disabled:cursor-wait transition-colors"
      >
        {isBusy ? <Spinner className="w-4 h-4" /> : <KeyIcon className="w-4 h-4" />}
        {isBusy ? 'Waiting for passkey…' : 'Sign in with a passkey'}
      </button>
      {error && (
        <p role="alert" className="text-[12.5px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
};

export default PasskeyLoginButton;
