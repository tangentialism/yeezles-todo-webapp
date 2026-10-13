import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AppContent } from '../App';
import { useAuth } from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('../contexts/AreaContext', () => ({
  AreaProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('../components/LoginButton', () => ({ default: () => <div>login-screen</div> }));
vi.mock('../components/Dashboard', () => ({ default: () => <div>dashboard</div> }));
vi.mock('../components/OAuthConsentPage', () => ({ default: () => <div>consent-page</div> }));
vi.mock('../components/proposals/ProposalReview', () => ({ default: () => <div>proposal-review</div> }));

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
};

function renderAt(url: string, auth: { isAuthenticated: boolean; isLoading: boolean }) {
  vi.mocked(useAuth).mockReturnValue(auth as ReturnType<typeof useAuth>);
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AppContent />
      <LocationProbe />
    </MemoryRouter>
  );
}

describe('App routes: /oauth/consent', () => {
  it('shows the login screen at the consent URL itself when signed out, so the request id survives sign-in', () => {
    renderAt('/oauth/consent?request=req-1', { isAuthenticated: false, isLoading: false });

    expect(screen.getByText('login-screen')).toBeInTheDocument();
    expect(screen.queryByText('consent-page')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/oauth/consent?request=req-1');
  });

  it('shows the consent page, not the dashboard, when signed in', () => {
    renderAt('/oauth/consent?request=req-1', { isAuthenticated: true, isLoading: false });

    expect(screen.getByText('consent-page')).toBeInTheDocument();
    expect(screen.queryByText('dashboard')).not.toBeInTheDocument();
  });

  it('shows neither while auth is still being checked', () => {
    renderAt('/oauth/consent?request=req-1', { isAuthenticated: false, isLoading: true });

    expect(screen.getByText(/checking authentication/i)).toBeInTheDocument();
    expect(screen.queryByText('consent-page')).not.toBeInTheDocument();
    expect(screen.queryByText('login-screen')).not.toBeInTheDocument();
  });

  it('still routes everything else to the dashboard', () => {
    renderAt('/', { isAuthenticated: true, isLoading: false });

    expect(screen.getByText('dashboard')).toBeInTheDocument();
  });
});

describe('App routes: /topics/proposals/:id', () => {
  it('shows the review page when signed in', () => {
    renderAt('/topics/proposals/7', { isAuthenticated: true, isLoading: false });
    expect(screen.getByText('proposal-review')).toBeInTheDocument();
    expect(screen.queryByText('dashboard')).not.toBeInTheDocument();
  });

  it('shows the login screen at the same URL when signed out, so the id survives sign-in', () => {
    renderAt('/topics/proposals/7', { isAuthenticated: false, isLoading: false });
    expect(screen.getByText('login-screen')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/topics/proposals/7');
  });
});
