import React from 'react';
import Checkbox from '../ui/Checkbox';
import { dangerTextButton, fieldError, fieldInput, outlineButton } from '../ui/styles';
import { canUseExisting } from '../../utils/proposalDraft';
import type { Draft, DraftAction, DraftTopic } from '../../utils/proposalDraft';
import { TOPIC_DESCRIPTION_MAX, TOPIC_NAME_MAX } from '../../constants';
import ProposalRow from './ProposalRow';
import NoteEditBlock from './NoteEditBlock';

/** Props for {@link ProposalTopicSection}. */
interface ProposalTopicSectionProps {
  topic: DraftTopic;
  draft: Draft;
  dispatch: React.Dispatch<DraftAction>;
}

/**
 * One topic's part of the review (spec §6.2). A NEW topic gets a keep
 * checkbox, an editable name and description, and the taken-name fixes (the
 * name field is the "Rename"; Use existing shows while the topic is `taken`).
 * An existing topic shows its open count when known. Then its rows and note edit.
 */
const ProposalTopicSection: React.FC<ProposalTopicSectionProps> = ({ topic, draft, dispatch }) => {
  const rows = draft.rows.filter((r) => r.target === topic.key);
  const note = draft.notes.find((n) => n.key === topic.key);
  const label = topic.name.trim() || 'Unnamed topic';

  return (
    <section aria-label={label} data-draft-error={topic.error || topic.nameError ? 'true' : undefined} className="pt-7">
      <div className="flex flex-wrap items-center gap-3 pb-2 border-b-[1.5px] border-ink">
        {topic.kind === 'new' ? (
          <>
            {/* Final review M5: heading navigation reaches NEW sections too (ruling L26). */}
            <h2 className="sr-only">{label}</h2>
            <Checkbox
              checked={topic.accepted}
              onChange={() => dispatch({ type: 'toggleTopic', key: topic.key })}
              aria-label={`Keep new topic "${topic.name}"`}
            />
            <input
              aria-label="Topic name"
              value={topic.name}
              maxLength={TOPIC_NAME_MAX}
              onChange={(e) => dispatch({ type: 'renameTopic', key: topic.key, name: e.target.value })}
              className="flex-1 min-w-[160px] bg-transparent border-0 border-b border-line-strong py-1 text-[17px] font-medium text-ink focus:outline-none focus:border-accent"
            />
            <span className="font-mono text-[11px] font-medium tracking-[0.12em] text-accent-ink">NEW</span>
          </>
        ) : (
          <>
            <h2 className="font-medium text-[17px] text-ink">{topic.name}</h2>
            {topic.kind === 'existing' && topic.openCount !== null && (
              <span className="font-mono text-xs text-ink-muted">{`${topic.openCount} open`}</span>
            )}
            {topic.archived && <span className="text-[12px] text-ink-faint">archived</span>}
            {topic.kind === 'unknown' && <span className="text-[12.5px] text-accent-ink">Topic not found</span>}
          </>
        )}
        <span className="flex-1" />
        <button
          type="button"
          className={dangerTextButton}
          onClick={() => dispatch({ type: 'rejectSection', key: topic.key })}
          aria-label={`Reject all in ${label}`}
        >
          Reject all
        </button>
      </div>

      {topic.kind === 'new' && (
        <div className="mt-2 flex flex-col gap-2">
          <input
            aria-label="Topic description"
            placeholder="Description (optional)"
            value={topic.description ?? ''}
            maxLength={TOPIC_DESCRIPTION_MAX}
            onChange={(e) => dispatch({ type: 'describeTopic', key: topic.key, description: e.target.value })}
            className={fieldInput}
          />
          {topic.taken && topic.nameError === null && (
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-danger">
              <span>{`A topic named "${topic.name}" already exists. Rename it above${canUseExisting(draft, topic) ? ', or' : '.'}`}</span>
              {canUseExisting(draft, topic) && (
                <button type="button" className={outlineButton} onClick={() => dispatch({ type: 'useExisting', key: topic.key })}>
                  {`Use existing "${topic.name}"`}
                </button>
              )}
            </div>
          )}
          {topic.nameError && <p className={fieldError}>{topic.nameError}</p>}
          {topic.error && <p className={fieldError}>{topic.error}</p>}
        </div>
      )}

      {rows.length > 0 && (
        <div role="list">
          {rows.map((row) => (
            <ProposalRow key={row.key} row={row} draft={draft} dispatch={dispatch} />
          ))}
        </div>
      )}
      {note && <NoteEditBlock note={note} topic={topic} draft={draft} dispatch={dispatch} />}
    </section>
  );
};

export default ProposalTopicSection;
