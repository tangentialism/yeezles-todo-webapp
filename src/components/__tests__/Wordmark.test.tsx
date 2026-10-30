import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import Wordmark from '../ui/Wordmark';
import PageShell from '../ui/PageShell';
import LoginButton from '../LoginButton';
import Dashboard from '../Dashboard';
import { renderWithProviders } from '../../test/test-utils';
import type { User } from '../../contexts/AuthContext';

// The Rising Hash lockup: the bare mark in front of "Yeezles" wherever the
// wordmark appears (David, 2026-10-30). The mark is decorative, so the name
// assistive tech hears stays exactly "Yeezles".

vi.mock('../../services/passkeyApi');
vi.mock('../PasskeyLoginButton', () => ({ default: () => null }));
vi.mock('../ApiStatus', () => ({ default: () => null }));
vi.mock('../Navigation', () => ({ default: () => null }));
vi.mock('../ViewContainer', () => ({ default: () => null }));
vi.mock('../AddTodoModal', () => ({ default: () => null }));
vi.mock('../../hooks/useNavCounts', () => ({ useTodayOpenCount: () => null, usePendingProposalCount: () => null }));
vi.mock('../../hooks/useTopicsHandoff', () => ({ useTopicsHandoff: () => {} }));

/** The mark inside a lockup: hidden from assistive tech, with the brand sun. */
const expectMark = (lockup: HTMLElement) => {
  const mark = lockup.querySelector('svg');
  expect(mark).not.toBeNull();
  expect(mark).toHaveAttribute('aria-hidden', 'true');
  expect(mark!.querySelector('circle')).toHaveAttribute('fill', '#F4893A');
  // The mark comes before the word
  expect(lockup.firstElementChild).toBe(mark);
};

describe('Wordmark lockup', () => {
  it('renders the mark before the word, and only the word is named', () => {
    render(<Wordmark />);
    const word = screen.getByText('Yeezles');
    const lockup = word.parentElement!;
    expectMark(lockup);
    expect(lockup).toHaveTextContent(/^Yeezles$/);
  });

  it('app header shows the lockup', () => {
    const user: User = { id: 'u1', email: 'ada@example.com', name: 'Ada', picture: '' };
    renderWithProviders(<Dashboard />, {
      initialUser: user,
      initialAuthState: { isAuthenticated: true, isLoading: false, isGoogleReady: true },
      includeToast: false, includeArea: false, includeQueryClient: false,
    });
    const header = screen.getByRole('banner');
    expectMark(within(header).getByText('Yeezles').parentElement!);
  });

  it('standalone page header: the lockup is the link, named "Yeezles"', () => {
    render(<PageShell homeHref="/">body</PageShell>);
    const link = screen.getByRole('link', { name: 'Yeezles' });
    expectMark(within(link).getByText('Yeezles').parentElement!);
  });

  it('standalone page header without a link still shows the lockup', () => {
    render(<PageShell>body</PageShell>);
    expectMark(screen.getByText('Yeezles').parentElement!);
  });

  it('sign-in card: the heading is the lockup, named "Yeezles"', () => {
    renderWithProviders(<LoginButton />, {
      initialAuthState: { isAuthenticated: false, isLoading: false, isGoogleReady: false },
      includeToast: false, includeArea: false, includeQueryClient: false,
    });
    const heading = screen.getByRole('heading', { level: 1, name: 'Yeezles' });
    expectMark(within(heading).getByText('Yeezles').parentElement!);
  });
});
