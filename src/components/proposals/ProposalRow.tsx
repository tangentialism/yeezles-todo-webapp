import React from 'react';
import Checkbox from '../ui/Checkbox';
import { fieldError } from '../ui/styles';
import { rowCheckable, rowReason } from '../../utils/proposalDraft';
import type { Draft, DraftAction, DraftRow } from '../../utils/proposalDraft';
import TopicTargetSelect from './TopicTargetSelect';

/** Props for {@link ProposalRow}. */
interface ProposalRowProps {
  row: DraftRow;
  draft: Draft;
  dispatch: React.Dispatch<DraftAction>;
}

/** One proposed assignment: checkbox, title, "was:", reason, error and target select. */
const ProposalRow: React.FC<ProposalRowProps> = ({ row, draft, dispatch }) => {
  const checkable = rowCheckable(draft, row);
  const included = row.accepted && checkable;
  const reason = rowReason(draft, row);
  return (
    <div
      role="listitem"
      data-draft-error={row.error ? 'true' : undefined}
      className={`flex flex-wrap items-start gap-x-3 gap-y-2 py-3 border-b border-line ${included ? '' : 'opacity-70'}`}
    >
      <span className="pt-0.5">
        <Checkbox
          checked={included}
          onChange={() => dispatch({ type: 'toggleRow', key: row.key })}
          disabled={!checkable}
          aria-label={`Accept "${row.title}"`}
        />
      </span>
      <div className="flex-1 min-w-0">
        <div className={`text-[15px] leading-6 ${row.lock === 'missing' ? 'line-through text-ink-faint' : 'text-ink'}`}>
          {row.title}
          {row.completed && <span className="ml-2 font-mono text-[11px] text-ink-faint">done</span>}
        </div>
        <div className="text-[12.5px] text-ink-muted">
          <span>{`was: ${row.currentTopic?.name ?? 'none'}`}</span>
          {reason && <span className="ml-2 text-accent-ink">{reason}</span>}
        </div>
        {row.error && <p className={fieldError}>{row.error}</p>}
      </div>
      <div className="basis-full sm:basis-56">
        <TopicTargetSelect
          label={`Topic for "${row.title}"`}
          value={row.target}
          draft={draft}
          allowNone={false}
          disabled={row.lock !== null}
          onSelect={(key) => key && dispatch({ type: 'redirectRow', key: row.key, target: key })}
          onCreate={(name) => dispatch({ type: 'addTopic', name, rowKey: row.key })}
        />
      </div>
    </div>
  );
};

export default ProposalRow;
