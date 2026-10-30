import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useReducer } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProposalTopicSection from '../ProposalTopicSection';
import UnassignedTab from '../UnassignedTab';
import ReadOnlyProposal from '../ReadOnlyProposal';
import NoTopicSection from '../NoTopicSection';
import { draftReducer, initDraft, noTopicTodos, sections } from '../../../utils/proposalDraft';
import PeopleChangesSection from '../PeopleChangesSection';
import {
  makeCandidate, makeCandidateRef, makeMatchedRef, makeProposedTodo, makeResolved, makeResolvedPeopleChange, makeResolvedWithPeople,
} from '../../../test/proposalFactories';
import { makePerson, makeTodoPerson } from '../../../test/personFactories';
import type { ResolvedProposal } from '../../../types/proposal';

const peopleApi = vi.hoisted(() => ({ getPeople: vi.fn(), createPerson: vi.fn() }));
vi.mock('../../../hooks/useApi', () => ({ useApi: () => peopleApi }));
vi.mock('../../../hooks/useCrossTabSync', () => ({ useCrossTabSync: () => ({ broadcast: vi.fn() }) }));
vi.mock('../../../hooks/useIsPhone', () => ({ useIsPhone: () => false }));

/** Renders every section and the Unassigned tab over a live reducer. */
const Harness: React.FC<{ resolved?: ResolvedProposal }> = ({ resolved }) => {
  const [draft, dispatch] = useReducer(draftReducer, resolved ?? makeResolved(), initDraft);
  return (
    <>
      {sections(draft).map((topic) => <ProposalTopicSection key={topic.key} topic={topic} draft={draft} dispatch={dispatch} />)}
      {noTopicTodos(draft).length > 0 && <NoTopicSection draft={draft} dispatch={dispatch} />}
      {draft.peopleRows.length > 0 && <PeopleChangesSection draft={draft} dispatch={dispatch} />}
      <UnassignedTab draft={draft} dispatch={dispatch} />
    </>
  );
};

describe('review sections', () => {
  it('renders new and existing sections with their rows and states', () => {
    render(<Harness />);
    const kitchen = screen.getByRole('region', { name: 'Kitchen reno' });
    expect(within(kitchen).getByText('NEW')).toBeInTheDocument();
    expect(within(kitchen).getByRole('checkbox', { name: 'Accept "Order countertop"' })).toBeChecked();
    expect(within(kitchen).getByText('First note')).toBeInTheDocument();

    const garden = screen.getByRole('region', { name: 'Garden' });
    expect(within(garden).getByRole('heading', { level: 2, name: 'Garden' })).toBeInTheDocument();
    expect(within(garden).getByText('3 open')).toBeInTheDocument();
    expect(within(garden).getByText('was: Shed')).toBeInTheDocument();
    expect(within(garden).getByRole('checkbox', { name: 'Accept "Todo #4"' })).toBeDisabled();
    expect(within(garden).getByText('Todo deleted')).toBeInTheDocument();
    expect(within(garden).getByText('Moved to another area')).toBeInTheDocument();
    expect(within(garden).getByText('Bulbs ordered.')).toBeInTheDocument();
  });

  it('a NEW section has an h2 like an existing one, following renames (final review M5, ruling L26)', async () => {
    render(<Harness />);
    const kitchen = screen.getByRole('region', { name: 'Kitchen reno' });
    expect(within(kitchen).getByRole('heading', { level: 2, name: 'Kitchen reno' })).toBeInTheDocument();
    const name = within(kitchen).getByRole('textbox', { name: 'Topic name' });
    await userEvent.clear(name);
    await userEvent.type(name, 'Pantry');
    expect(within(screen.getByRole('region', { name: 'Pantry' })).getByRole('heading', { level: 2, name: 'Pantry' })).toBeInTheDocument();
  });

  it('shows no open count for a topic whose count is unknown', () => {
    render(<Harness />);
    const website = screen.getByRole('region', { name: 'Website' });
    expect(within(website).queryByText(/open/)).not.toBeInTheDocument();
  });

  it('a taken name offers Use existing, which merges the section into the existing topic', async () => {
    render(<Harness />);
    const taken = screen.getByRole('region', { name: 'Taken' });
    expect(within(taken).getByText(/A topic named "Taken" already exists/)).toBeInTheDocument();
    await userEvent.click(within(taken).getByRole('button', { name: 'Use existing "Taken"' }));
    const existing = screen.getByRole('region', { name: 'Taken' });
    expect(within(existing).queryByText('NEW')).not.toBeInTheDocument();
    expect(within(existing).getByRole('checkbox', { name: 'Accept "Fix gate"' })).toBeChecked();
  });

  it('unchecking a new topic greys its rows with "needs a topic"', async () => {
    render(<Harness />);
    const kitchen = screen.getByRole('region', { name: 'Kitchen reno' });
    await userEvent.click(within(kitchen).getByRole('checkbox', { name: 'Keep new topic "Kitchen reno"' }));
    expect(within(kitchen).getAllByText('needs a topic')).toHaveLength(2);
    expect(within(kitchen).getByRole('checkbox', { name: 'Accept "Order countertop"' })).toBeDisabled();
  });

  it('redirecting a row moves it to the target section', async () => {
    render(<Harness />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Topic for "Mulch beds"' }), 'Kitchen reno');
    expect(within(screen.getByRole('region', { name: 'Kitchen reno' })).getByText('Mulch beds')).toBeInTheDocument();
  });

  it('New topic… from a row creates a topic inline and moves the row', async () => {
    render(<Harness />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Topic for "Mulch beds"' }), 'New topic…');
    await userEvent.type(screen.getByRole('textbox', { name: 'New topic name' }), 'garden');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('A topic named "garden" already exists.')).toBeInTheDocument();
    await userEvent.clear(screen.getByRole('textbox', { name: 'New topic name' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'New topic name' }), 'Beds');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(within(screen.getByRole('region', { name: 'Beds' })).getByText('Mulch beds')).toBeInTheDocument();
  });

  it('editing a note shows a textarea with the proposed text', async () => {
    render(<Harness />);
    const garden = screen.getByRole('region', { name: 'Garden' });
    await userEvent.click(within(garden).getByRole('button', { name: 'Edit note for "Garden"' }));
    const box = within(garden).getByRole('textbox', { name: 'Proposed note for "Garden"' });
    await userEvent.clear(box);
    await userEvent.type(box, 'Mulch done.');
    expect(box).toHaveValue('Mulch done.');
  });

  it('the Unassigned tab adds a row to the chosen section', async () => {
    render(<Harness />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Topic for "Paint fence"' }), 'Garden');
    expect(within(screen.getByRole('region', { name: 'Garden' })).getByText('Paint fence')).toBeInTheDocument();
  });
});

describe('ReadOnlyProposal', () => {
  it('groups the applied payload by topic and titles unknown todos by id', () => {
    const resolved = makeResolved();
    render(
      <ReadOnlyProposal
        resolved={resolved}
        payload={{ area_id: 2, new_topics: [{ name: 'Kitchen reno', description: null }], assignments: [{ todo_id: 1, topic: 'Kitchen reno' }, { todo_id: 20, topic: 'Garden' }], note_edits: [{ topic: 'Garden', status_note: 'Done.' }] }}
      />
    );
    expect(within(screen.getByRole('region', { name: 'Kitchen reno' })).getByText('Order countertop')).toBeInTheDocument();
    const garden = screen.getByRole('region', { name: 'Garden' });
    expect(within(garden).getByText('Todo #20')).toBeInTheDocument();
    expect(within(garden).getByText('Done.')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});

const withNewTodos = (todos: ReturnType<typeof makeProposedTodo>[]): ResolvedProposal => ({ ...makeResolved(), new_todos: todos });

describe('new todos in the review', () => {
  it('a new todo renders under its topic with a New badge, its due date and Today flag', () => {
    render(<Harness resolved={withNewTodos([makeProposedTodo({ title: 'Buy grout', topic: 'Kitchen reno', due_date: '2026-10-20', is_today: true })])} />);
    const kitchen = screen.getByRole('region', { name: 'Kitchen reno' });
    expect(within(kitchen).getByRole('checkbox', { name: 'Create "Buy grout"' })).toBeChecked();
    const row = within(kitchen).getByText('Buy grout').closest('[role="listitem"]') as HTMLElement;
    expect(within(row).getByText('New')).toBeInTheDocument();
    expect(within(row).getByText(/Oct 20/)).toBeInTheDocument();
    expect(within(row).getByText('Today')).toBeInTheDocument();
  });

  it('No topic section lists null-target new todos and is absent when there are none', () => {
    const { unmount } = render(<Harness resolved={withNewTodos([makeProposedTodo({ title: 'Call plumber' })])} />);
    const none = screen.getByRole('region', { name: 'No topic' });
    expect(within(none).getByRole('heading', { level: 2, name: 'No topic' })).toBeInTheDocument();
    expect(within(none).getByText('Call plumber')).toBeInTheDocument();
    expect(within(none).getByRole('combobox', { name: 'Topic for "Call plumber"' })).toHaveDisplayValue('No topic');
    unmount();
    render(<Harness resolved={withNewTodos([makeProposedTodo({ title: 'Buy grout', topic: 'Garden' })])} />);
    expect(screen.queryByRole('region', { name: 'No topic' })).not.toBeInTheDocument();
  });

  it('the missing-topic line shows for a vanished topic', () => {
    render(<Harness resolved={withNewTodos([makeProposedTodo({ title: 'Lost one', topic: 'Gone' })])} />);
    const none = screen.getByRole('region', { name: 'No topic' });
    expect(within(none).getByText("Claude proposed 'Gone', which no longer exists")).toBeInTheDocument();
  });

  it('unchecking a new topic section moves its todo row into No topic', async () => {
    render(<Harness resolved={withNewTodos([makeProposedTodo({ title: 'Buy grout', topic: 'Kitchen reno' })])} />);
    expect(screen.queryByRole('region', { name: 'No topic' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Keep new topic "Kitchen reno"' }));
    expect(within(screen.getByRole('region', { name: 'No topic' })).getByText('Buy grout')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Kitchen reno' })).queryByText('Buy grout')).not.toBeInTheDocument();
  });

  it('unchecking a new todo and retargeting it works from the row', async () => {
    render(<Harness resolved={withNewTodos([makeProposedTodo({ title: 'Call plumber' })])} />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Topic for "Call plumber"' }), 'Garden');
    expect(within(screen.getByRole('region', { name: 'Garden' })).getByRole('checkbox', { name: 'Create "Call plumber"' })).toBeChecked();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Create "Call plumber"' }));
    expect(screen.getByRole('checkbox', { name: 'Create "Call plumber"' })).not.toBeChecked();
  });
});

describe('ReadOnlyProposal created todos', () => {
  it('lists created todos from applied, grouped by topic, and renders a phase 2 payload without new_todos', () => {
    const resolved = makeResolved();
    const { unmount } = render(
      <ReadOnlyProposal
        resolved={resolved}
        payload={{
          area_id: 2,
          new_topics: [{ name: 'Kitchen reno', description: null }],
          assignments: [],
          note_edits: [],
          new_todos: [makeProposedTodo({ title: 'Buy grout', topic: 'Kitchen reno' }), makeProposedTodo({ title: 'Call plumber', topic: null })],
        }}
      />
    );
    expect(within(screen.getByRole('region', { name: 'Kitchen reno' })).getByText('Buy grout')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'No topic' })).getByText('Call plumber')).toBeInTheDocument();
    unmount();
    render(<ReadOnlyProposal resolved={resolved} payload={{ area_id: 2, new_topics: [], assignments: [{ todo_id: 1, topic: 'Garden' }], note_edits: [] }} />);
    expect(within(screen.getByRole('region', { name: 'Garden' })).getByText('Order countertop')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'No topic' })).not.toBeInTheDocument();
  });

  it('a real topic named "No topic" and no-topic todos render without a duplicate key', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ReadOnlyProposal
        resolved={makeResolved()}
        payload={{
          area_id: 2,
          new_topics: [],
          assignments: [],
          note_edits: [],
          new_todos: [makeProposedTodo({ title: 'In real', topic: 'No topic' }), makeProposedTodo({ title: 'In none', topic: null })],
        }}
      />
    );
    expect(screen.getAllByRole('region', { name: 'No topic' })).toHaveLength(2);
    expect(spy.mock.calls.filter((c) => String(c[0]).includes('same key'))).toEqual([]);
    spy.mockRestore();
  });
});


const renderPeople = (resolved: ResolvedProposal) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Harness resolved={resolved} />
    </QueryClientProvider>
  );

describe('people on review rows', () => {
  it('a new todo shows one chip per ref and a + person button that opens the compact field', async () => {
    peopleApi.getPeople.mockResolvedValue([makePerson({ id: 9, display_name: 'Nina Nine' })]);
    renderPeople(makeResolvedWithPeople({ new_todos: [[makeMatchedRef(1, 'Priya Raman'), makeCandidateRef('ambiguous', 'Sam')]] }));
    const row = screen.getByText('New todo 0').closest('[role="listitem"]') as HTMLElement;
    expect(within(row).getByText('Priya Raman')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: '? Sam' })).toBeInTheDocument();
    await userEvent.click(within(row).getByRole('button', { name: '+ person' }));
    await userEvent.type(within(row).getByRole('combobox', { name: 'People' }), 'Nin');
    await userEvent.click(await within(row).findByRole('option', { name: /Nina Nine/ }));
    expect(within(row).getByText('Nina Nine')).toBeInTheDocument();
  });
});

describe('keyboard focus after a chip action (final review I3)', () => {
  it('after a pick, focus lands on the settled chip remove button', async () => {
    const sam = { ...makeCandidateRef('ambiguous', 'Sam'), candidates: [makeCandidate({ id: 5, display_name: 'Sam Lee' })] };
    renderPeople(makeResolvedWithPeople({ new_todos: [[sam]] }));
    await userEvent.click(screen.getByRole('button', { name: '? Sam' }));
    await userEvent.click(screen.getByRole('button', { name: /Sam Lee/ }));
    expect(screen.getByRole('button', { name: 'Remove Sam Lee' })).toHaveFocus();
  });

  it('after a Drop, focus lands on the next chip in the row', async () => {
    renderPeople(makeResolvedWithPeople({ new_todos: [[makeCandidateRef('new', 'Dana'), makeMatchedRef(1, 'Priya Raman')]] }));
    await userEvent.click(screen.getByRole('button', { name: '? Dana' }));
    await userEvent.click(screen.getByRole('button', { name: /Drop/ }));
    expect(screen.getByRole('button', { name: 'Remove Priya Raman' })).toHaveFocus();
  });

  it('after a Drop on the last chip, focus lands on + person', async () => {
    renderPeople(makeResolvedWithPeople({ new_todos: [[makeCandidateRef('new', 'Dana')]] }));
    await userEvent.click(screen.getByRole('button', { name: '? Dana' }));
    await userEvent.click(screen.getByRole('button', { name: /Drop/ }));
    expect(screen.getByRole('button', { name: '+ person' })).toHaveFocus();
  });

  it('after the x on a settled chip, focus moves on rather than falling to the page', async () => {
    renderPeople(makeResolvedWithPeople({ new_todos: [[makeMatchedRef(1, 'Priya Raman')]] }));
    await userEvent.click(screen.getByRole('button', { name: 'Remove Priya Raman' }));
    expect(screen.getByRole('button', { name: '+ person' })).toHaveFocus();
  });

  it('after a Drop on a people row, focus lands on the row checkbox', async () => {
    renderPeople(makeResolvedWithPeople({ people_changes: [makeResolvedPeopleChange({ title: 'Mulch beds', add: [makeCandidateRef('new', 'Dana')] })] }));
    await userEvent.click(screen.getByRole('button', { name: '? Dana' }));
    await userEvent.click(screen.getByRole('button', { name: /Drop/ }));
    expect(screen.getByRole('checkbox', { name: 'Change people on "Mulch beds"' })).toHaveFocus();
  });

  it('after adding a person, focus returns to + person', async () => {
    peopleApi.getPeople.mockResolvedValue([makePerson({ id: 9, display_name: 'Nina Nine' })]);
    renderPeople(makeResolvedWithPeople({ new_todos: [[]] }));
    await userEvent.click(screen.getByRole('button', { name: '+ person' }));
    await userEvent.type(screen.getByRole('combobox', { name: 'People' }), 'Nin');
    await userEvent.click(await screen.findByRole('option', { name: /Nina Nine/ }));
    expect(screen.getByRole('button', { name: '+ person' })).toHaveFocus();
  });
});

describe('the + person field closes (final review M4)', () => {
  it('Escape closes it, returns focus to + person, and does not reach the dialog', async () => {
    const onKey = vi.fn();
    renderPeople(makeResolvedWithPeople({ new_todos: [[]] }));
    document.addEventListener('keydown', onKey);
    await userEvent.click(screen.getByRole('button', { name: '+ person' }));
    expect(screen.getByRole('combobox', { name: 'People' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    document.removeEventListener('keydown', onKey);
    expect(screen.queryByRole('combobox', { name: 'People' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ person' })).toHaveFocus();
    expect(onKey).not.toHaveBeenCalled();
  });

  it('an outside click closes it', async () => {
    renderPeople(makeResolvedWithPeople({ new_todos: [[]] }));
    await userEvent.click(screen.getByRole('button', { name: '+ person' }));
    await userEvent.click(document.body);
    expect(screen.queryByRole('combobox', { name: 'People' })).not.toBeInTheDocument();
  });
});

describe('PeopleChangesSection', () => {
  const change = makeResolvedPeopleChange({
    title: 'Mulch beds',
    current_topic: { id: 5, name: 'Garden' },
    add: [makeMatchedRef(1, 'Priya Raman')],
    remove: [
      { person_id: 2, person: makeTodoPerson({ id: 2, display_name: 'Old Pal' }) },
      { person_id: 8, person: null },
    ],
  });

  it('shows the checkbox, title, topic subtitle, additions and struck-through removals', () => {
    renderPeople(makeResolvedWithPeople({ people_changes: [change, makeResolvedPeopleChange({ todo_id: 4, title: 'Loose', current_topic: null })] }));
    const section = screen.getByRole('region', { name: 'People' });
    expect(within(section).getByRole('heading', { level: 2, name: 'People' })).toBeInTheDocument();
    expect(within(section).getByRole('checkbox', { name: 'Change people on "Mulch beds"' })).toBeChecked();
    expect(within(section).getByText('Garden')).toBeInTheDocument();
    expect(within(section).getByText('No topic')).toBeInTheDocument();
    expect(within(section).getByText('Priya Raman')).toBeInTheDocument();
    expect(within(section).getByRole('group', { name: 'Remove Old Pal' })).toBeInTheDocument();
    expect(within(section).getByText('Old Pal').className).toContain('line-through');
    expect(within(section).getByText('person 8').className).toContain('line-through');
  });

  it('the keep toggle un-strikes the removal and back, with a stable name and a pressed state (final review I2)', async () => {
    renderPeople(makeResolvedWithPeople({ people_changes: [change] }));
    const section = screen.getByRole('region', { name: 'People' });
    const toggle = () => within(section).getByRole('button', { name: 'Keep Old Pal' });
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
    expect(toggle()).toHaveTextContent('keep');
    expect(within(section).getByRole('group', { name: 'Remove Old Pal' })).toBeInTheDocument();
    await userEvent.click(toggle());
    expect(within(section).getByText('Old Pal').className).not.toContain('line-through');
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
    expect(toggle()).toHaveTextContent('keep');
    expect(within(section).getByRole('group', { name: 'Keeping Old Pal' })).toBeInTheDocument();
    await userEvent.click(toggle());
    expect(within(section).getByText('Old Pal').className).toContain('line-through');
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
  });

  it('a chip error on a people row marks the row for the 422 scroll (final review I1)', () => {
    const marked = makeResolvedWithPeople({ people_changes: [change] });
    const d = initDraft(marked);
    const withError = { ...d, peopleRows: d.peopleRows.map((r) => ({ ...r, add: r.add.map((p) => ({ ...p, error: 'person is gone' })) })) };
    const Fixed: React.FC = () => <PeopleChangesSection draft={withError} dispatch={() => {}} />;
    render(<QueryClientProvider client={new QueryClient()}><Fixed /></QueryClientProvider>);
    expect(screen.getByText('Mulch beds').closest('[role="listitem"]')).toHaveAttribute('data-draft-error', 'true');
  });

  it('unchecking the row toggles it', async () => {
    renderPeople(makeResolvedWithPeople({ people_changes: [change] }));
    const box = screen.getByRole('checkbox', { name: 'Change people on "Mulch beds"' });
    await userEvent.click(box);
    expect(box).not.toBeChecked();
  });

  it('a missing todo says so and its checkbox is disabled and unchecked', () => {
    renderPeople(makeResolvedWithPeople({ people_changes: [makeResolvedPeopleChange({ missing: true, title: null })] }));
    const section = screen.getByRole('region', { name: 'People' });
    expect(within(section).getByText('This todo no longer exists')).toBeInTheDocument();
    const box = within(section).getByRole('checkbox');
    expect(box).toBeDisabled();
    expect(box).not.toBeChecked();
  });
});

describe('ReadOnlyProposal people summary', () => {
  it('shows the people-change count from the applied payload', () => {
    const resolved = makeResolved();
    const payload = { ...resolved.proposal.payload, people_changes: [{ todo_id: 3, add: [{ person_id: 1 }], remove: [] }] };
    render(<ReadOnlyProposal resolved={resolved} payload={payload} />);
    expect(screen.getByText(/1 people change/)).toBeInTheDocument();
  });
});
