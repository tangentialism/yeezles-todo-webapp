import React, { useEffect, useReducer, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useArea } from '../../contexts/AreaContext';
import { useToast } from '../../contexts/ToastContext';
import { useProposal, useProposalActions } from '../../hooks/useProposalStore';
import { isApiError } from '../../services/apiError';
import type { ResolvedProposal } from '../../types/proposal';
import type { TopicsHandoff } from '../../hooks/useTopicsHandoff';
import { formatRelative } from '../../utils/date';
import {
  applyBlocker, counts, draftReducer, initDraft, noTopicTodos, sections, serialize, summarizeAccepted,
} from '../../utils/proposalDraft';
import type { Draft, DraftAction } from '../../utils/proposalDraft';
import PageShell from '../ui/PageShell';
import Dialog from '../ui/Dialog';
import { Spinner } from '../ui/Icons';
import { dangerTextButton, ghostButton, primaryButton } from '../ui/styles';
import { ViewError, ViewLoading } from '../ViewChrome';
import ProposalTopicSection from './ProposalTopicSection';
import NoTopicSection from './NoTopicSection';
import PeopleChangesSection from './PeopleChangesSection';
import UnassignedTab from './UnassignedTab';
import ReadOnlyProposal from './ReadOnlyProposal';

type ReviewAction = DraftAction | { type: 'init'; resolved: ResolvedProposal };

const reviewReducer = (state: Draft | null, action: ReviewAction): Draft | null =>
  action.type === 'init' ? initDraft(action.resolved) : state && draftReducer(state, action);

const Banner: React.FC<{ tone?: 'danger' | 'info'; children: React.ReactNode }> = ({ tone = 'info', children }) => (
  <div
    role={tone === 'danger' ? 'alert' : 'status'}
    className={`mt-5 rounded-[12px] px-4 py-3 text-sm ${tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-hover text-ink-2'}`}
  >
    {children}
  </div>
);

/** "Apply 1 change" / "Apply N changes" (ruling L5). */
const applyLabel = (n: number) => `Apply ${n} ${n === 1 ? 'change' : 'changes'}`;

/**
 * `/topics/proposals/:id` (spec §6, §7): review a pending proposal grouped by
 * topic, edit it, then apply the accepted subset or reject it. Applied and
 * rejected proposals render read-only.
 */
const ProposalReview: React.FC = () => {
  const { id: rawId } = useParams();
  const id = Number(rawId);
  const validId = Number.isInteger(id) && id > 0;
  const navigate = useNavigate();
  const { areas } = useArea();
  const { showToast } = useToast();
  const { data: resolved, isLoading, error, refetch } = useProposal(validId ? id : null);
  const { applyProposal, rejectProposal, markResolvedElsewhere, isApplying, isRejecting } = useProposalActions();
  // Final review M4: one footer action at a time.
  const busy = isApplying || isRejecting;
  const [draft, dispatch] = useReducer(reviewReducer, null);
  const [tab, setTab] = useState<'topics' | 'unassigned'>('topics');
  const [banner, setBanner] = useState<'invalid' | 'resolved-elsewhere' | null>(null);
  const [confirmReject, setConfirmReject] = useState(false);

  const status = resolved?.proposal.status;
  const draftId = draft?.proposalId;
  useEffect(() => {
    if (resolved && status === 'pending' && resolved.area && draftId !== resolved.proposal.id) {
      dispatch({ type: 'init', resolved });
    }
  }, [resolved, status, draftId]);

  const page = (children: React.ReactNode) => (
    <PageShell homeHref="/">
      <main className="mx-4 sm:mx-auto sm:max-w-[760px] mt-2 sm:mt-6 pb-36">{children}</main>
    </PageShell>
  );

  // Ruling L4b: like the load error, a 404/400 replaces the page only when
  // nothing is loaded; a background refetch error keeps the draft on screen.
  const notFound = !validId || (!resolved && isApiError(error) && (error.status === 404 || error.status === 400));
  if (notFound) {
    return page(
      <>
        <ViewError title="Proposal not found" message="It may have been deleted, or the link is wrong." />
        <p className="text-center">
          <Link to="/" className={ghostButton}>Back to Yeezles</Link>
        </p>
      </>
    );
  }
  // Ruling L4: likewise for any other load error.
  if (error && !resolved) {
    return page(
      <ViewError
        title="Could not load the proposal"
        message={error instanceof Error ? error.message : 'Please try again.'}
        onRetry={() => refetch()}
      />
    );
  }
  if (isLoading || !resolved) return page(<ViewLoading label="Loading proposal..." />);

  const { proposal } = resolved;
  const areaId = resolved.area?.id ?? proposal.payload.area_id;
  const area = areas.find((a) => a.id === areaId);
  const handBack = (highlightTopicIds?: number[]) => {
    const state: TopicsHandoff = { view: 'topics', areaId: resolved.area ? areaId : null, ...(highlightTopicIds ? { highlightTopicIds } : {}) };
    navigate('/', { state });
  };

  const header = (
    <header className="pb-3 border-b-[1.5px] border-ink">
      <h1 className="font-serif font-medium text-[30px] sm:text-4xl leading-[1.1] tracking-[-0.015em] text-ink">{`Proposal #${proposal.id}`}</h1>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-muted">
        {proposal.source && <span>{`from ${proposal.source}`}</span>}
        <span>{formatRelative(proposal.created_at)}</span>
        {resolved.area && (
          <span className="inline-flex items-center gap-1.5">
            {area && <span aria-hidden="true" className="w-2 h-2 rounded-full" style={{ backgroundColor: area.color }} />}
            {resolved.area.name}
          </span>
        )}
        <span>{resolved.summary}</span>
      </p>
    </header>
  );

  const handleReject = async () => {
    try {
      await rejectProposal(proposal.id);
      showToast({ message: 'Proposal rejected', type: 'success' });
      handBack();
    } catch (err) {
      setConfirmReject(false);
      if (isApiError(err, 'PROPOSAL_RESOLVED')) {
        setBanner('resolved-elsewhere');
        markResolvedElsewhere();
        await refetch();
      } else {
        showToast({ message: `Could not reject: ${err instanceof Error ? err.message : 'unexpected error'}`, type: 'error' });
      }
    }
  };

  const rejectDialog = confirmReject && (
    <Dialog title="Reject proposal" onClose={() => setConfirmReject(false)} closeDisabled={isRejecting}>
      <p className="px-7 pt-3 text-[14.5px] text-ink-2">Reject this proposal? Nothing in it will be applied.</p>
      <div className="flex items-center justify-end gap-1.5 pl-7 pr-5 pt-5 pb-5">
        <button type="button" className={ghostButton} onClick={() => setConfirmReject(false)} disabled={isRejecting}>
          Cancel
        </button>
        <button type="button" className={primaryButton} onClick={handleReject} disabled={isRejecting}>
          {isRejecting && <Spinner className="w-4 h-4" />}
          Reject proposal
        </button>
      </div>
    </Dialog>
  );

  const footer = (applyArea: React.ReactNode) => (
    <div className="fixed inset-x-0 bottom-0 z-20 bg-paper/95 backdrop-blur border-t border-line-strong">
      <div className="max-w-[760px] mx-auto px-4 py-3 flex items-center gap-3">
        <button type="button" className={dangerTextButton} onClick={() => setConfirmReject(true)} disabled={busy}>
          Reject all…
        </button>
        {applyArea}
      </div>
    </div>
  );

  if (status !== 'pending') {
    const resolvedAt = proposal.resolved_at ?? proposal.created_at;
    return page(
      <>
        {header}
        {banner === 'resolved-elsewhere' && <Banner>This proposal was already applied or rejected elsewhere.</Banner>}
        <p className="mt-4 text-sm text-ink-muted">
          {status === 'applied' ? `Applied ${formatRelative(resolvedAt)}` : `Rejected ${formatRelative(resolvedAt)}`}
        </p>
        <ReadOnlyProposal resolved={resolved} payload={proposal.applied ?? proposal.payload} muted={status === 'rejected'} />
      </>
    );
  }

  if (!resolved.area) {
    return page(
      <>
        {header}
        <Banner tone="danger">This proposal's area was deleted. It can only be rejected.</Banner>
        <ReadOnlyProposal resolved={resolved} payload={proposal.payload} muted />
        {footer(<span className="flex-1" />)}
        {rejectDialog}
      </>
    );
  }

  if (!draft) return page(<ViewLoading label="Loading proposal..." />);

  const { accepted: acceptedCount, total } = counts(draft);
  const blocker = applyBlocker(draft);

  const handleApply = async () => {
    const { accepted, pathIndex } = serialize(draft);
    setBanner(null);
    try {
      const result = await applyProposal(proposal.id, accepted);
      showToast({ message: `Applied: ${summarizeAccepted(accepted)}`, type: 'success' });
      handBack(result.created_topics.map((t) => t.id));
    } catch (err) {
      if (isApiError(err, 'PROPOSAL_INVALID')) {
        dispatch({ type: 'attachErrors', errors: err.errors, pathIndex });
        // Final review M1: the marked rows render only on the By topic tab.
        setTab('topics');
        setBanner('invalid');
        requestAnimationFrame(() => document.querySelector('[data-draft-error="true"]')?.scrollIntoView?.({ block: 'center' }));
      } else if (isApiError(err, 'PROPOSAL_RESOLVED')) {
        // Spec §7.1: refetch, which brings the resolved status and the read-only view.
        setBanner('resolved-elsewhere');
        markResolvedElsewhere();
        await refetch();
      } else {
        showToast({ message: `Could not apply: ${err instanceof Error ? err.message : 'unexpected error'}`, type: 'error' });
      }
    }
  };

  const tabClass = (active: boolean) =>
    `py-2.5 px-0.5 text-sm border-b-[1.5px] transition-colors ${active ? 'border-ink text-ink' : 'border-transparent text-ink-muted hover:text-ink'}`;

  return page(
    <>
      {header}
      <p className="mt-2 font-mono text-xs text-ink-muted">{`${acceptedCount} of ${total} accepted`}</p>
      {banner === 'invalid' && (
        <Banner tone="danger">
          Nothing was applied. Fix or uncheck the marked items.
          {draft.pageErrors.length > 0 && (
            <ul className="mt-1.5 list-disc pl-5">
              {draft.pageErrors.map((message) => <li key={message}>{message}</li>)}
            </ul>
          )}
        </Banner>
      )}
      {banner === 'resolved-elsewhere' && <Banner>This proposal was already applied or rejected elsewhere.</Banner>}

      <div role="tablist" aria-label="Review" className="mt-5 flex gap-6 border-b border-line">
        <button type="button" role="tab" aria-selected={tab === 'topics'} className={tabClass(tab === 'topics')} onClick={() => setTab('topics')}>
          By topic
        </button>
        <button type="button" role="tab" aria-selected={tab === 'unassigned'} className={tabClass(tab === 'unassigned')} onClick={() => setTab('unassigned')}>
          {`Unassigned (${draft.unassigned.length})`}
        </button>
      </div>

      <div role="tabpanel">
        {tab === 'topics' ? (
          <>
            {sections(draft).map((topic) => <ProposalTopicSection key={topic.key} topic={topic} draft={draft} dispatch={dispatch} />)}
            {noTopicTodos(draft).length > 0 && <NoTopicSection draft={draft} dispatch={dispatch} />}
            {draft.peopleRows.length > 0 && <PeopleChangesSection draft={draft} dispatch={dispatch} />}
          </>
        ) : (
          <UnassignedTab draft={draft} dispatch={dispatch} />
        )}
      </div>

      {footer(
        <>
          <span className="flex-1 text-right text-[12.5px] text-ink-muted">{blocker}</span>
          <button type="button" className={primaryButton} disabled={blocker !== null || busy} onClick={handleApply}>
            {isApplying && <Spinner className="w-4 h-4" />}
            {applyLabel(acceptedCount)}
          </button>
        </>
      )}
      {rejectDialog}
    </>
  );
};

export default ProposalReview;
