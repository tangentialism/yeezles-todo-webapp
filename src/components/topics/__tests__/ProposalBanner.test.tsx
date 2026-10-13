import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProposalBanner from '../ProposalBanner';
import * as ProposalStore from '../../../hooks/useProposalStore';

vi.mock('../../../hooks/useProposalStore');
const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const row = (id: number, source: string | null, minutes: number, summary: string) =>
  ({ id, kind: 'topic_changes', status: 'pending', source, created_at: ago(minutes), resolved_at: null, summary });
const mockPending = (data: unknown[]) =>
  vi.mocked(ProposalStore.usePendingProposals).mockReturnValue({ data } as unknown as ReturnType<typeof ProposalStore.usePendingProposals>);
const renderBanner = () => render(<MemoryRouter><ProposalBanner /></MemoryRouter>);

describe('ProposalBanner', () => {
  it('renders nothing with no pending proposal', () => {
    mockPending([]);
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it('one pending: who, when, what, and a Review link', () => {
    mockPending([row(7, 'Claude', 20, '1 new topic, 2 assignments')]);
    renderBanner();
    expect(screen.getByRole('status')).toHaveTextContent('Claude proposed changes 20 minutes ago · 1 new topic, 2 assignments');
    expect(screen.getByRole('link', { name: 'Review' })).toHaveAttribute('href', '/topics/proposals/7');
  });

  it('several pending: a count and a link per proposal', () => {
    mockPending([row(9, 'Claude', 5, 'a'), row(8, null, 60, 'b'), row(7, 'Claude', 120, 'c')]);
    renderBanner();
    expect(screen.getByRole('status')).toHaveTextContent('3 proposals waiting');
    expect(screen.getAllByRole('link').map((l) => l.getAttribute('href'))).toEqual([
      '/topics/proposals/9', '/topics/proposals/8', '/topics/proposals/7',
    ]);
  });
});
