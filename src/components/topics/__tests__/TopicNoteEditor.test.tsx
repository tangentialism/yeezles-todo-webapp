import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TopicNoteEditor from '../TopicNoteEditor';
import * as TopicStore from '../../../hooks/useTopicStore';
import { makeTopic } from '../../../test/topicFactories';

vi.mock('../../../hooks/useTopicStore');
const setTopicNote = vi.fn();

describe('TopicNoteEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(TopicStore.useTopicMutations).mockReturnValue({
      setTopicNote, isSavingNote: false,
    } as unknown as ReturnType<typeof TopicStore.useTopicMutations>);
  });

  it('enables Save only after a change and sends the new text', async () => {
    setTopicNote.mockResolvedValue({});
    render(<TopicNoteEditor topic={makeTopic({ id: 4, status_note: 'Old', status_note_updated_at: new Date().toISOString() })} />);
    const save = screen.getByRole('button', { name: 'Save note' });
    expect(save).toBeDisabled();
    expect(screen.getByText(/^Updated /)).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Status note'));
    await userEvent.type(screen.getByLabelText('Status note'), 'Countertop ordered.');
    expect(save).toBeEnabled();
    await userEvent.click(save);
    expect(setTopicNote).toHaveBeenCalledWith(4, 'Countertop ordered.');
  });

  it('saves blank text as null and says Never updated without a timestamp', async () => {
    setTopicNote.mockResolvedValue({});
    render(<TopicNoteEditor topic={makeTopic({ id: 4, status_note: 'Old', status_note_updated_at: null })} />);
    expect(screen.getByText('Never updated')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Status note'));
    await userEvent.type(screen.getByLabelText('Status note'), '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Save note' }));
    expect(setTopicNote).toHaveBeenCalledWith(4, null);
  });

  it('picks up a note saved elsewhere when the text is untouched', () => {
    const { rerender } = render(<TopicNoteEditor topic={makeTopic({ id: 4, status_note: 'One' })} />);
    rerender(<TopicNoteEditor topic={makeTopic({ id: 4, status_note: 'Two' })} />);
    expect(screen.getByLabelText('Status note')).toHaveValue('Two');
  });

  // The backend trims every note, so the saved text can differ from what was typed
  it('after saving text with surrounding whitespace, shows the saved note and disables Save', async () => {
    setTopicNote.mockResolvedValue(makeTopic({ id: 4, status_note: 'Countertop ordered.' }));
    const { rerender } = render(<TopicNoteEditor topic={makeTopic({ id: 4, status_note: 'Old' })} />);
    await userEvent.clear(screen.getByLabelText('Status note'));
    await userEvent.type(screen.getByLabelText('Status note'), '  Countertop ordered.{enter}');
    await userEvent.click(screen.getByRole('button', { name: 'Save note' }));
    // The mutation writes the saved topic to the cache, which re-renders with it
    rerender(<TopicNoteEditor topic={makeTopic({ id: 4, status_note: 'Countertop ordered.' })} />);
    expect(screen.getByLabelText('Status note')).toHaveValue('Countertop ordered.');
    expect(screen.getByRole('button', { name: 'Save note' })).toBeDisabled();
  });

  it('after saving a blank note, empties the box and disables Save', async () => {
    setTopicNote.mockResolvedValue(makeTopic({ id: 4, status_note: null }));
    const { rerender } = render(<TopicNoteEditor topic={makeTopic({ id: 4, status_note: 'Old' })} />);
    await userEvent.clear(screen.getByLabelText('Status note'));
    await userEvent.type(screen.getByLabelText('Status note'), '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Save note' }));
    rerender(<TopicNoteEditor topic={makeTopic({ id: 4, status_note: null })} />);
    expect(screen.getByLabelText('Status note')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Save note' })).toBeDisabled();
  });

  it('shows a counter from 9,000 characters', () => {
    render(<TopicNoteEditor topic={makeTopic({ status_note: 'x'.repeat(9_001) })} />);
    expect(screen.getByText('9,001 / 10,000')).toBeInTheDocument();
  });

  it('shows a failed save under the field and keeps the text', async () => {
    setTopicNote.mockRejectedValue(new Error('Could not reach the server. Check your connection and try again.'));
    render(<TopicNoteEditor topic={makeTopic({ id: 4, status_note: '' })} />);
    await userEvent.type(screen.getByLabelText('Status note'), 'Draft');
    await userEvent.click(screen.getByRole('button', { name: 'Save note' }));
    expect(await screen.findByText('Could not reach the server. Check your connection and try again.')).toBeInTheDocument();
    expect(screen.getByLabelText('Status note')).toHaveValue('Draft');
  });
});
