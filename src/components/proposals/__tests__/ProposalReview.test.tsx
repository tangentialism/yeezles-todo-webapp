import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ProposalReview from '../ProposalReview';
import * as AreaContextModule from '../../../contexts/AreaContext';
import * as ProposalStore from '../../../hooks/useProposalStore';
import { ApiError } from '../../../services/apiError';
import { areaContextValue, makeArea } from '../../../test/topicFactories';
import { makeResolved } from '../../../test/proposalFactories';
import type { ResolvedProposal } from '../../../types/proposal';

vi.mock('../../../contexts/AreaContext');
vi.mock('../../../hooks/useProposalStore');
const showToast = vi.fn();
vi.mock('../../../contexts/ToastContext', () => ({ useToast: () => ({ showToast, hideToast: vi.fn() }) }));

const applyProposal = vi.fn();
const rejectProposal = vi.fn();
const refetch = vi.fn();

const mockProposal = (data: ResolvedProposal | undefined, error: Error | null = null) =>
  vi.mocked(ProposalStore.useProposal).mockReturnValue({
    data, isLoading: false, error, refetch,
  } as unknown as ReturnType<typeof ProposalStore.useProposal>);

/** The fixture proposal, resolved with the given status. */
const resolvedAs = (status: 'applied' | 'rejected', applied: ResolvedProposal['proposal']['applied'] = null): ResolvedProposal => {
  const resolved = makeResolved();
  resolved.proposal = { ...resolved.proposal, status, resolved_at: new Date().toISOString(), applied };
  return resolved;
};

const Home = () => {
  const location = useLocation();
  return <div data-testid="home">{JSON.stringify(location.state)}</div>;
};

const renderAt = (path = '/topics/proposals/7') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/topics/proposals/:id" element={<ProposalReview />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </MemoryRouter>
  );

const applyButton = () => screen.getByRole('button', { name: /^Apply/ });

describe('ProposalReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AreaContextModule, 'useArea').mockReturnValue(areaContextValue({ areas: [makeArea({ id: 2, name: 'Home', color: '#43A047' })] }));
    vi.mocked(ProposalStore.useProposalActions).mockReturnValue({
      applyProposal, rejectProposal, isApplying: false, isRejecting: false,
    } as unknown as ReturnType<typeof ProposalStore.useProposalActions>);
    mockProposal(makeResolved());
  });

  it('shows the header, the accepted count, and blocks Apply on the taken name', () => {
    renderAt();
    expect(screen.getByRole('heading', { level: 1, name: 'Proposal #7' })).toBeInTheDocument();
    expect(screen.getByText('from Claude')).toBeInTheDocument();
    expect(screen.getByText('20 minutes ago')).toBeInTheDocument();
    expect(screen.getByText('8 of 11 accepted')).toBeInTheDocument();
    expect(applyButton()).toBeDisabled();
    expect(applyButton()).toHaveTextContent('Apply 8 changes');
    expect(screen.getByText('Fix 1 topic name first.')).toBeInTheDocument();
  });

  it('applies exactly the serialized payload and hands back to the Topics tab with highlights', async () => {
    applyProposal.mockResolvedValue({ proposal: { id: 7, status: 'applied' }, created_topics: [{ id: 30, name: 'Kitchen reno' }] });
    renderAt();
    await userEvent.click(screen.getByRole('button', { name: 'Use existing "Taken"' }));
    await userEvent.click(applyButton());
    expect(applyProposal).toHaveBeenCalledWith(7, {
      area_id: 2,
      new_topics: [{ name: 'Kitchen reno', description: 'The big one' }],
      assignments: [
        { todo_id: 1, topic: 'Kitchen reno' },
        { todo_id: 2, topic: 'Kitchen reno' },
        { todo_id: 3, topic: 'Garden' },
        { todo_id: 7, topic: 'Taken' },
      ],
      note_edits: [
        { topic: 'Kitchen reno', status_note: 'Planning.' },
        { topic: 'Garden', status_note: 'Bulbs in; mulch next.' },
      ],
    });
    expect(showToast).toHaveBeenCalledWith({ message: 'Applied: 1 new topic, 4 assignments, 2 notes', type: 'success' });
    expect(JSON.parse(screen.getByTestId('home').textContent!)).toEqual({ view: 'topics', areaId: 2, highlightTopicIds: [30] });
  });

  it('a 422 marks the rows and keeps the draft; a second apply re-maps after edits', async () => {
    applyProposal.mockRejectedValueOnce(new ApiError(422, 'PROPOSAL_INVALID', '1 item(s) cannot be applied; nothing was applied', [
      { path: 'assignments[2].todo_id', reason: 'todo is in a different area' },
    ]));
    renderAt();
    await userEvent.click(screen.getByRole('button', { name: 'Use existing "Taken"' }));
    await userEvent.click(applyButton());
    expect(screen.getByRole('alert')).toHaveTextContent('Nothing was applied. Fix or uncheck the marked items.');
    const garden = screen.getByRole('region', { name: 'Garden' });
    expect(within(garden).getByText('todo is in a different area')).toBeInTheDocument();

    await userEvent.click(within(garden).getByRole('checkbox', { name: 'Accept "Mulch beds"' }));
    expect(within(garden).queryByText('todo is in a different area')).not.toBeInTheDocument();
    applyProposal.mockRejectedValueOnce(new ApiError(422, 'PROPOSAL_INVALID', 'x', [{ path: 'assignments[2].todo_id', reason: 'second' }]));
    await userEvent.click(applyButton());
    expect(applyProposal.mock.calls[1][1].assignments.map((a: { todo_id: number }) => a.todo_id)).toEqual([1, 2, 7]);
    expect(within(screen.getByRole('region', { name: 'Taken' })).getByText('second')).toBeInTheDocument();
  });

  it('a 409 refetches, says it was resolved elsewhere and renders read-only', async () => {
    applyProposal.mockRejectedValue(new ApiError(409, 'PROPOSAL_RESOLVED', 'Proposal is already applied'));
    refetch.mockImplementation(async () => {
      mockProposal(resolvedAs('applied'));
      return {};
    });
    renderAt();
    await userEvent.click(screen.getByRole('button', { name: 'Use existing "Taken"' }));
    await userEvent.click(applyButton());
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('This proposal was already applied or rejected elsewhere.')).toBeInTheDocument();
    expect(screen.getByText(/^Applied /)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Apply/ })).not.toBeInTheDocument();
  });

  it('a network failure toasts, keeps the draft and leaves Apply enabled for a retry', async () => {
    applyProposal.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection and try again.'));
    renderAt();
    await userEvent.click(screen.getByRole('button', { name: 'Use existing "Taken"' }));
    await userEvent.click(applyButton());
    expect(applyProposal).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    expect(applyButton()).toBeEnabled();
    expect(screen.getByText('7 of 10 accepted')).toBeInTheDocument();
  });

  it('switches to the Unassigned tab and back', async () => {
    renderAt();
    await userEvent.click(screen.getByRole('tab', { name: 'Unassigned (1)' }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Topic for "Paint fence"' }), 'Garden');
    await userEvent.click(screen.getByRole('tab', { name: 'By topic' }));
    expect(within(screen.getByRole('region', { name: 'Garden' })).getByText('Paint fence')).toBeInTheDocument();
  });

  it('rejects after confirmation and hands back without highlights', async () => {
    rejectProposal.mockResolvedValue({ id: 7, status: 'rejected' });
    renderAt();
    await userEvent.click(screen.getByRole('button', { name: 'Reject all…' }));
    await userEvent.click(screen.getByRole('button', { name: 'Reject proposal' }));
    expect(rejectProposal).toHaveBeenCalledWith(7);
    expect(JSON.parse(screen.getByTestId('home').textContent!)).toEqual({ view: 'topics', areaId: 2 });
  });

  it('an applied proposal renders what was applied, read-only', () => {
    mockProposal(resolvedAs('applied', { area_id: 2, new_topics: [], assignments: [{ todo_id: 3, topic: 'Garden' }], note_edits: [] }));
    renderAt();
    expect(screen.getByText(/^Applied /)).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Garden' })).getByText('Mulch beds')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Kitchen reno' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Apply/ })).not.toBeInTheDocument();
  });

  it('a rejected proposal renders its payload read-only', () => {
    mockProposal(resolvedAs('rejected'));
    renderAt();
    expect(screen.getByText(/^Rejected /)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Kitchen reno' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Garden' })).getByText('Mulch beds')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Apply/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject all…' })).not.toBeInTheDocument();
  });

  it('renaming the taken topic to a free name clears the blocker and enables Apply', async () => {
    renderAt();
    const name = within(screen.getByRole('region', { name: 'Taken' })).getByRole('textbox', { name: 'Topic name' });
    await userEvent.clear(name);
    await userEvent.type(name, 'Gate');
    expect(screen.queryByText('Fix 1 topic name first.')).not.toBeInTheDocument();
    expect(applyButton()).toBeEnabled();
  });

  it('rejecting every section disables Apply and says to reject instead', async () => {
    renderAt();
    for (const section of ['Kitchen reno', 'Taken', 'Garden', 'Website']) {
      await userEvent.click(screen.getByRole('button', { name: `Reject all in ${section}` }));
    }
    expect(screen.getByText('0 of 11 accepted')).toBeInTheDocument();
    expect(screen.getByText('Nothing accepted. Reject instead.')).toBeInTheDocument();
    expect(applyButton()).toBeDisabled();
  });

  it('says "Apply 1 change" for a single accepted item', async () => {
    renderAt();
    for (const section of ['Kitchen reno', 'Taken', 'Website']) {
      await userEvent.click(screen.getByRole('button', { name: `Reject all in ${section}` }));
    }
    const garden = screen.getByRole('region', { name: 'Garden' });
    await userEvent.click(within(garden).getByRole('checkbox', { name: 'Accept "Mulch beds"' }));
    expect(screen.getByText('1 of 11 accepted')).toBeInTheDocument();
    expect(applyButton()).toHaveTextContent(/^Apply 1 change$/);
  });

  it('keeps a loaded draft when a background refetch fails', () => {
    mockProposal(makeResolved(), new ApiError(500, 'HTTP_500', 'Server error'));
    renderAt();
    expect(screen.queryByText('Could not load the proposal')).not.toBeInTheDocument();
    expect(screen.getByText('8 of 11 accepted')).toBeInTheDocument();
  });

  it('shows the load error with its message when nothing is loaded', () => {
    mockProposal(undefined, new ApiError(500, 'HTTP_500', 'Server error'));
    renderAt();
    expect(screen.getByText('Could not load the proposal')).toBeInTheDocument();
    expect(screen.getByText('Server error')).toBeInTheDocument();
  });

  it('a pending proposal whose area was deleted can only be rejected', () => {
    mockProposal(makeResolved({ area: null }));
    renderAt();
    expect(screen.getByText("This proposal's area was deleted. It can only be rejected.")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Apply/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject all…' })).toBeInTheDocument();
  });

  it('shows not found for a 404 and for a malformed id', () => {
    mockProposal(undefined, new ApiError(404, 'PROPOSAL_NOT_FOUND', 'Proposal not found'));
    const { unmount } = renderAt();
    expect(screen.getByText('Proposal not found')).toBeInTheDocument();
    unmount();
    mockProposal(undefined);
    renderAt('/topics/proposals/abc');
    expect(screen.getByText('Proposal not found')).toBeInTheDocument();
  });
});
