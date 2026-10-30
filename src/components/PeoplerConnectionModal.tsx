import React, { useState } from 'react';
import { usePeoplerConnection, usePeoplerConnectionActions } from '../hooks/usePeoplerStore';
import { peoplerErrorMessage } from '../utils/peoplerErrors';
import Dialog from './ui/Dialog';
import { ViewLoading } from './ViewChrome';
import { dangerTextButton, fieldError, fieldHint, fieldInput, fieldLabel, ghostButton, primaryButton } from './ui/styles';

interface PeoplerConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Connect or disconnect the signed-in user's Peopler account, from the account
 * menu. The pasted token lives only in this component's state: it goes to
 * `connect` once and is never logged, stored, toasted or put in a query key.
 * Returning null when closed unmounts the state, so a typed token dies with it.
 */
const PeoplerConnectionModal: React.FC<PeoplerConnectionModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <Dialog title="Peopler" onClose={onClose}>
      <PeoplerConnectionBody />
    </Dialog>
  );
};

const PeoplerConnectionBody: React.FC = () => {
  const { data: connection, isLoading, error: loadError } = usePeoplerConnection();
  const { connect, disconnect, isConnecting, isDisconnecting } = usePeoplerConnectionActions();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);

  if (isLoading) return <ViewLoading label="Loading Peopler" />;
  if (loadError || !connection) {
    return <p role="alert" className={fieldError}>{peoplerErrorMessage(loadError)}</p>;
  }

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed || isConnecting) return;
    setError(null);
    try {
      await connect(trimmed);
      setToken('');
    } catch (err) {
      setError(peoplerErrorMessage(err));
    }
  };

  const handleDisconnect = async () => {
    setError(null);
    try {
      await disconnect();
      setConfirmingDisconnect(false);
    } catch (err) {
      setError(peoplerErrorMessage(err));
    }
  };

  if (connection.connected && connection.status === 'ok') {
    const who = connection.peopler_display_name
      ? `${connection.peopler_display_name} (${connection.peopler_email})`
      : connection.peopler_email;
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink">Connected as {who}</p>
        {confirmingDisconnect ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-2">Disconnect Peopler? Links stay, but stop working until you connect again.</p>
            <div className="flex gap-2">
              <button type="button" onClick={handleDisconnect} disabled={isDisconnecting} className={dangerTextButton}>
                Disconnect
              </button>
              <button type="button" onClick={() => setConfirmingDisconnect(false)} className={ghostButton}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmingDisconnect(true)} className={dangerTextButton}>
            Disconnect
          </button>
        )}
        {error && <p role="alert" className={fieldError}>{error}</p>}
      </div>
    );
  }

  const broken = connection.connected;
  return (
    <form onSubmit={handleConnect} className="space-y-4">
      {broken ? (
        <p className="text-sm text-ink">Peopler stopped accepting this token. Paste a new one.</p>
      ) : (
        <>
          <p className="text-sm text-ink-2">Connect your Peopler account to link people here to people in Peopler.</p>
          <p className={fieldHint}>Get a token in Peopler → Settings → API token.</p>
        </>
      )}
      <div>
        <label htmlFor="peopler-api-token" className={fieldLabel}>Peopler API token</label>
        <input
          id="peopler-api-token"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className={fieldInput}
        />
        {error && <p role="alert" className={fieldError}>{error}</p>}
      </div>
      <button type="submit" disabled={!token.trim() || isConnecting} className={primaryButton}>
        Connect
      </button>
    </form>
  );
};

export default PeoplerConnectionModal;
