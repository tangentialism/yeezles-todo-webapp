import { describe, it, expect, vi } from 'vitest';
import React, { useReducer } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProposalTopicSection from '../ProposalTopicSection';
import UnassignedTab from '../UnassignedTab';
import ReadOnlyProposal from '../ReadOnlyProposal';
import NoTopicSection from '../NoTopicSection';
import { draftReducer, initDraft, noTopicTodos, sections } from '../../../utils/proposalDraft';
import { makeProposedTodo, makeResolved } from '../../../test/proposalFactories';
import type { ResolvedProposal } from '../../../types/proposal';

/** Renders every section and the Unassigned tab over a live reducer. */
const Harness: React.FC<{ resolved?: ResolvedProposal }> = ({ resolved }) => {
  const [draft, dispatch] = useReducer(draftReducer, resolved ?? makeResolved(), initDraft);
  return (
    <>
      {sections(draft).map((topic) => <ProposalTopicSection key={topic.key} topic={topic} draft={draft} dispatch={dispatch} />)}
      {noTopicTodos(draft).length > 0 && <NoTopicSection draft={draft} dispatch={dispatch} />}
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
