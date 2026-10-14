import React from 'react';
import { Link } from 'react-router-dom';
import { usePendingProposals } from '../../hooks/useProposalStore';
import { formatRelative } from '../../utils/date';

const LINK = 'font-medium text-accent-ink underline underline-offset-2 hover:text-ink';

/**
 * "Claude proposed changes 20 minutes ago · <summary> · Review" above the
 * Topics list, or a list when several are waiting (spec §7.3). Proposals
 * carry no area, so it shows on every area.
 */
const ProposalBanner: React.FC = () => {
  const { data: pending = [] } = usePendingProposals();
  if (pending.length === 0) return null;
  const box = 'mt-4 rounded-[12px] bg-accent-soft px-4 py-3 text-sm text-ink-2';

  if (pending.length === 1) {
    const [p] = pending;
    const who = p.source ? `${p.source} proposed changes` : 'Changes were proposed';
    return (
      <div role="status" className={box}>
        {`${who} ${formatRelative(p.created_at)} · ${p.summary} · `}
        <Link to={`/topics/proposals/${p.id}`} className={LINK}>
          Review
        </Link>
      </div>
    );
  }

  return (
    <div role="status" className={box}>
      <p className="font-medium text-ink">{`${pending.length} proposals waiting`}</p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {pending.map((p) => (
          <li key={p.id}>
            <Link to={`/topics/proposals/${p.id}`} className={LINK}>
              {p.summary}
            </Link>
            {` · ${formatRelative(p.created_at)}`}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProposalBanner;
