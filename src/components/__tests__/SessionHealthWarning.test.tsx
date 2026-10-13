import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SessionHealthWarning from '../SessionHealthWarning';
import { useAuth } from '../../contexts/AuthContext';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

const withSession = (daysUntilExpiry: number | null, needsRefreshWarning = true) =>
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated: true,
    authMethod: 'persistent-session',
    sessionHealth: { daysUntilExpiry, needsRefreshWarning },
  } as unknown as ReturnType<typeof useAuth>);

describe('SessionHealthWarning', () => {
  it('renders nothing when no warning is due', () => {
    withSession(40, false);
    const { container } = render(<SessionHealthWarning />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the days left and a gentle prompt', () => {
    withSession(6);
    render(<SessionHealthWarning />);
    expect(screen.getByRole('status')).toHaveTextContent('Session ends in 6 days');
    expect(screen.getByText('Sign in again to refresh it.')).toBeInTheDocument();
  });

  it('turns urgent near expiry', () => {
    withSession(1);
    render(<SessionHealthWarning />);
    expect(screen.getByRole('status')).toHaveTextContent('Session ends in 1 day');
    expect(screen.getByText('Sign in again soon.')).toBeInTheDocument();
  });
});
