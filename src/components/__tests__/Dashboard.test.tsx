import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from '../Dashboard';
import { renderWithProviders } from '../../test/test-utils';
import * as passkeyApi from '../../services/passkeyApi';
import type { User } from '../../contexts/AuthContext';

// Mock the passkey API so the real PasskeyEnrollment component (rendered
// inside the modal under test) never hits the network or a real WebAuthn
// ceremony -- same reasoning as PasskeyEnrollment.test.tsx.
vi.mock('../../services/passkeyApi');

// Stub out the rest of the signed-in shell. Navigation/ViewContainer/ApiStatus
// pull in useArea/useTodoStore/useApi and their own react-query wiring, which
// is exercised by their own test suites; Dashboard's own contract under test
// here is the header and the passkey-modal wiring it now owns, not the todo
// list or area picker internals. AddTodoModal is stubbed for the same reason
// -- it isn't part of this change.
vi.mock('../ApiStatus', () => ({ default: () => null }));
vi.mock('../Navigation', () => ({ default: () => null }));
vi.mock('../ViewContainer', () => ({ default: () => null }));
vi.mock('../AddTodoModal', () => ({ default: () => null }));

const testUser: User = {
  id: 'user-1',
  email: 'ada@example.com',
  name: 'Ada Lovelace',
  picture: 'https://example.com/avatar.jpg',
};

const renderDashboard = () =>
  renderWithProviders(<Dashboard />, {
    initialUser: testUser,
    initialAuthState: { isAuthenticated: true, isLoading: false, isGoogleReady: true },
    includeToast: false,
    includeArea: false,
    includeQueryClient: false,
  });

describe('Dashboard - passkey management entry point', () => {
  beforeEach(() => {
    vi.mocked(passkeyApi.listPasskeys).mockResolvedValue([]);
  });

  it('renders a "Manage passkeys" control for a signed-in user', () => {
    renderDashboard();

    expect(screen.getByRole('button', { name: /manage passkeys/i })).toBeInTheDocument();
  });

  it('opens the passkey modal, showing PasskeyEnrollment content, when clicked', async () => {
    const user = userEvent.setup();
    renderDashboard();

    expect(screen.queryByText(/no passkeys enrolled yet/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /manage passkeys/i }));

    // Content only PasskeyEnrollment renders confirms the real component
    // (not a stand-in) is mounted inside the modal.
    expect(await screen.findByText(/no passkeys enrolled yet/i)).toBeInTheDocument();
  });

  it('closes the modal when the close control is clicked', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('button', { name: /manage passkeys/i }));
    expect(await screen.findByText(/no passkeys enrolled yet/i)).toBeInTheDocument();

    // The close (X) button has no accessible text, matching the convention
    // used by AreaManagementModal / AddTodoModal.
    await user.click(screen.getByRole('button', { name: '' }));

    expect(screen.queryByText(/no passkeys enrolled yet/i)).not.toBeInTheDocument();
  });
});
