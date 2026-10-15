import React from 'react';
import type { ResolvedProposal, TopicChangesPayload } from '../../types/proposal';
import { normName } from '../../utils/proposalDraft';

/** Props for {@link ReadOnlyProposal}. */
interface ReadOnlyProposalProps {
  resolved: ResolvedProposal;
  /** `proposal.applied` for an applied proposal, else the stored payload. */
  payload: TopicChangesPayload;
  /** Grey it out (rejected). */
  muted?: boolean;
}

interface Group {
  name: string;
  isNew: boolean;
  todos: Array<{ title: string; created: boolean }>;
  note: string | null;
}

/**
 * A resolved proposal without controls, grouped by topic. Titles come from
 * the resolved assignments; other todos show as "Todo #id" (plan discrepancy 5).
 */
const ReadOnlyProposal: React.FC<ReadOnlyProposalProps> = ({ resolved, payload, muted = false }) => {
  const titleOf = (id: number) => resolved.assignments.find((a) => a.todo_id === id)?.title ?? `Todo #${id}`;
  const groups = new Map<string, Group>();
  const group = (name: string): Group => {
    const key = normName(name);
    const existing = groups.get(key);
    if (existing) return existing;
    const created: Group = { name: name.trim(), isNew: false, todos: [], note: null };
    groups.set(key, created);
    return created;
  };
  payload.new_topics.forEach((t) => {
    group(t.name).isNew = true;
  });
  payload.assignments.forEach((a) => group(a.topic).todos.push({ title: titleOf(a.todo_id), created: false }));
  payload.note_edits.forEach((n) => {
    group(n.topic).note = n.status_note;
  });
  // Phase 2 rows have no new_todos. A todo with no topic goes in a last "No topic" group.
  const noTopic: Group = { name: 'No topic', isNew: false, todos: [], note: null };
  (payload.new_todos ?? []).forEach((t) => (t.topic === null ? noTopic : group(t.topic)).todos.push({ title: t.title, created: true }));
  const shown = [...groups.values(), ...(noTopic.todos.length > 0 ? [noTopic] : [])];

  return (
    <div className={muted ? 'opacity-60' : ''}>
      {shown.map((g) => (
        <section key={normName(g.name)} aria-label={g.name} className="pt-6">
          <h2 className="flex items-center gap-3 pb-2 border-b border-line text-[17px] font-medium text-ink">
            {g.name}
            {g.isNew && <span className="font-mono text-[11px] tracking-[0.12em] text-accent-ink">NEW</span>}
          </h2>
          {g.todos.length > 0 && (
            <ul className="py-1">
              {g.todos.map(({ title, created }, i) => (
                <li key={`${title}-${i}`} className="py-2 border-b border-line text-[15px] text-ink-2">
                  {title}
                  {created && <span className="ml-2 font-mono text-[11px] tracking-[0.12em] text-accent-ink">NEW</span>}
                </li>
              ))}
            </ul>
          )}
          {g.note !== null && <p className="mt-3 text-sm text-ink-2 whitespace-pre-wrap">{g.note || '(note cleared)'}</p>}
        </section>
      ))}
    </div>
  );
};

export default ReadOnlyProposal;
