import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSyncExternalStore } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../../services/apiError';
import type { PeoplerConnection } from '../../types/peopler';

// A tiny external store stands in for the react-query cache: the real actions
// write the connection query on success and the modal re-renders from it.
const store = vi.hoisted(() => {
  const s = {
    value: { connected: false } as unknown,
    listeners: new Set<() => void>(),
    set(v: unknown) {
      s.value = v;
      s.listeners.forEach((l) => l());
    },
  };
  return s;
});
const connectMock = vi.hoisted(() => vi.fn());
const disconnectMock = vi.hoisted(() => vi.fn());
const queryState = vi.hoisted(() => ({ isLoading: false, error: null as unknown }));

vi.mock('../../hooks/usePeoplerStore', () => ({
  usePeoplerConnection: () => {
    const data = useSyncExternalStore(
      (cb) => {
        store.listeners.add(cb);
        return () => store.listeners.delete(cb);
      },
      () => store.value,
    );
    return { data, isLoading: queryState.isLoading, error: queryState.error, isError: !!queryState.error };
  },
  usePeoplerConnectionActions: () => ({
    connect: connectMock,
    disconnect: disconnectMock,
    isConnecting: false,
    isDisconnecting: false,
  }),
}));

import PeoplerConnectionModal from '../PeoplerConnectionModal';

const connected = (over: Partial<Extract<PeoplerConnection, { connected: true }>> = {}): PeoplerConnection => ({
  connected: true,
  status: 'ok',
  peopler_email: 'quill@example.test',
  peopler_display_name: 'Avery Quill',
  peopler_account_id: 7,
  last_verified_at: '2026-10-30T00:00:00Z',
  ...over,
});

const TOKEN = 'pk_test_invented_token_123';
let setItemSpy: ReturnType<typeof vi.spyOn>;

describe('PeoplerConnectionModal', () => {
  beforeEach(() => {
    store.value = { connected: false };
    queryState.isLoading = false;
    queryState.error = null;
    connectMock.mockReset();
    disconnectMock.mockReset();
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
  });
  afterEach(() => {
    // Review Focus 2: the token is in no storage write
    for (const call of setItemSpy.mock.calls) {
      expect(call.join(' ')).not.toContain(TOKEN);
    }
    setItemSpy.mockRestore();
  });

  it('renders nothing when closed', () => {
    const { container } = render(<PeoplerConnectionModal isOpen={false} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  describe('disconnected', () => {
    it('shows both copy lines and a password input', () => {
      render(<PeoplerConnectionModal isOpen onClose={() => {}} />);
      expect(screen.getByRole('heading', { name: 'Peopler' })).toBeInTheDocument();
      expect(screen.getByText('Connect your Peopler account to link people here to people in Peopler.')).toBeInTheDocument();
      expect(screen.getByText('Get a token in Peopler → Settings → API token.')).toBeInTheDocument();
      const input = screen.getByLabelText('Peopler API token');
      expect(input).toHaveAttribute('type', 'password');
      expect(input).toHaveAttribute('autocomplete', 'off');
      expect(input).toHaveAttribute('spellcheck', 'false');
    });

    it('disables Connect until text is typed, then connects with the trimmed value', async () => {
      connectMock.mockImplementation(async () => {
        const c = connected();
        store.set(c);
        return c;
      });
      render(<PeoplerConnectionModal isOpen onClose={() => {}} />);
      const button = screen.getByRole('button', { name: 'Connect' });
      expect(button).toBeDisabled();
      await userEvent.type(screen.getByLabelText('Peopler API token'), `  ${TOKEN}  `);
      expect(button).toBeEnabled();
      await userEvent.click(button);
      expect(connectMock).toHaveBeenCalledWith(TOKEN);
      expect(await screen.findByText('Connected as Avery Quill (quill@example.test)')).toBeInTheDocument();
    });

    it('keeps Connect disabled for whitespace only', async () => {
      render(<PeoplerConnectionModal isOpen onClose={() => {}} />);
      await userEvent.type(screen.getByLabelText('Peopler API token'), '   ');
      expect(screen.getByRole('button', { name: 'Connect' })).toBeDisabled();
    });
  });

  describe('errors', () => {
    it('shows the rejected sentence as an alert and keeps the input value', async () => {
      connectMock.mockRejectedValue(new ApiError(422, 'PEOPLER_TOKEN_REJECTED', 'rejected'));
      render(<PeoplerConnectionModal isOpen onClose={() => {}} />);
      await userEvent.type(screen.getByLabelText('Peopler API token'), TOKEN);
      await userEvent.click(screen.getByRole('button', { name: 'Connect' }));
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent("Peopler didn't accept that token. Copy it again from Peopler → Settings → API token.");
      expect(screen.getByLabelText('Peopler API token')).toHaveValue(TOKEN);
    });

    it.each([
      [502, "Couldn't reach Peopler. Try again in a minute."],
      [503, "Peopler isn't set up on this server."],
    ])('shows the %i unavailable sentence', async (status, sentence) => {
      connectMock.mockRejectedValue(new ApiError(status, 'PEOPLER_UNAVAILABLE', 'x'));
      render(<PeoplerConnectionModal isOpen onClose={() => {}} />);
      await userEvent.type(screen.getByLabelText('Peopler API token'), TOKEN);
      await userEvent.click(screen.getByRole('button', { name: 'Connect' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(sentence);
    });

    it('shows the load failure sentence', () => {
      queryState.error = new ApiError(502, 'PEOPLER_UNAVAILABLE', 'x');
      store.value = undefined;
      render(<PeoplerConnectionModal isOpen onClose={() => {}} />);
      expect(screen.getByText("Couldn't reach Peopler. Try again in a minute.")).toBeInTheDocument();
    });
  });

  describe('connected', () => {
    it('shows only the email when there is no display name', () => {
      store.value = connected({ peopler_display_name: null });
      render(<PeoplerConnectionModal isOpen onClose={() => {}} />);
      expect(screen.getByText('Connected as quill@example.test')).toBeInTheDocument();
    });

    it('confirms before disconnecting, and Cancel backs out', async () => {
      store.value = connected();
      render(<PeoplerConnectionModal isOpen onClose={() => {}} />);
      await userEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
      expect(screen.getByText('Disconnect Peopler? Links stay, but stop working until you connect again.')).toBeInTheDocument();
      expect(disconnectMock).not.toHaveBeenCalled();
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByText(/Disconnect Peopler\?/)).not.toBeInTheDocument();
      expect(disconnectMock).not.toHaveBeenCalled();
    });

    it('disconnects from the confirm, then shows the disconnected state', async () => {
      store.value = connected();
      disconnectMock.mockImplementation(async () => store.set({ connected: false }));
      render(<PeoplerConnectionModal isOpen onClose={() => {}} />);
      await userEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
      await userEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
      expect(disconnectMock).toHaveBeenCalledTimes(1);
      expect(await screen.findByLabelText('Peopler API token')).toBeInTheDocument();
    });
  });

  describe('broken', () => {
    it('says so and offers the token input again', () => {
      store.value = connected({ status: 'broken' });
      render(<PeoplerConnectionModal isOpen onClose={() => {}} />);
      expect(screen.getByText('Peopler stopped accepting this token. Paste a new one.')).toBeInTheDocument();
      expect(screen.getByLabelText('Peopler API token')).toHaveAttribute('type', 'password');
      expect(screen.getByRole('button', { name: 'Connect' })).toBeDisabled();
    });
  });

  it('forgets a typed token when closed and reopened', async () => {
    const { rerender } = render(<PeoplerConnectionModal isOpen onClose={() => {}} />);
    await userEvent.type(screen.getByLabelText('Peopler API token'), TOKEN);
    rerender(<PeoplerConnectionModal isOpen={false} onClose={() => {}} />);
    rerender(<PeoplerConnectionModal isOpen onClose={() => {}} />);
    expect(screen.getByLabelText('Peopler API token')).toHaveValue('');
  });
});
