import { describe, it, expect } from 'vitest';
import React, { useReducer } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProposalTopicSection from '../ProposalTopicSection';
import UnassignedTab from '../UnassignedTab';
import ReadOnlyProposal from '../ReadOnlyProposal';
import { draftReducer, initDraft, sections } from '../../../utils/proposalDraft';
import { makeResolved } from '../../../test/proposalFactories';

/** Renders every section and the Unassigned tab over a live reducer. */
const Harness: React.FC = () => {
  const [draft, dispatch] = useReducer(draftReducer, makeResolved(), initDraft);
  return (
    <>
      {sections(draft).map((topic) => <ProposalTopicSection key={topic.key} topic={topic} draft={draft} dispatch={dispatch} />)}
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
