import type React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewTopicDialog from '../NewTopicDialog';
import * as AreaContextModule from '../../../contexts/AreaContext';
import * as TopicStore from '../../../hooks/useTopicStore';
import { ApiError } from '../../../services/apiError';
import { areaContextValue, makeArea } from '../../../test/topicFactories';

vi.mock('../../../contexts/AreaContext');
vi.mock('../../../hooks/useTopicStore');

const home = makeArea({ id: 1, name: 'Home' });
const work = makeArea({ id: 2, name: 'Work' });
const createTopic = vi.fn();

describe('NewTopicDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AreaContextModule, 'useArea').mockReturnValue(areaContextValue({ areas: [home, work] }));
    vi.mocked(TopicStore.useTopicMutations).mockReturnValue({
      createTopic, isCreating: false,
    } as unknown as ReturnType<typeof TopicStore.useTopicMutations>);
  });

  it('creates in the implied area with a trimmed name and reports the new topic', async () => {
    const onCreated = vi.fn();
    const created = { id: 8, name: 'Garden', area_id: 1 };
    createTopic.mockResolvedValue(created);
    render(<NewTopicDialog defaultAreaId={1} onClose={vi.fn()} onCreated={onCreated} />);
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Name'), '  Garden  ');
    await userEvent.click(screen.getByRole('button', { name: 'Create topic' }));
    expect(createTopic).toHaveBeenCalledWith({ name: 'Garden', area_id: 1, description: null });
    expect(onCreated).toHaveBeenCalledWith(created);
  });

  it('requires an area when none is implied', async () => {
    render(<NewTopicDialog defaultAreaId={null} onClose={vi.fn()} onCreated={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Name'), 'Garden');
    expect(screen.getByRole('button', { name: 'Create topic' })).toBeDisabled();
    await userEvent.click(screen.getByRole('radio', { name: 'Work' }));
    expect(screen.getByRole('button', { name: 'Create topic' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'Create topic' }));
    expect(createTopic).toHaveBeenCalledWith(expect.objectContaining({ area_id: 2 }));
  });

  it('shows a taken name inline, including one that differs only by case', async () => {
    createTopic.mockRejectedValue(new ApiError(409, 'TOPIC_NAME_TAKEN', 'A topic named "Garden" already exists'));
    const onClose = vi.fn();
    render(<NewTopicDialog defaultAreaId={1} onClose={onClose} onCreated={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Name'), 'garden');
    await userEvent.click(screen.getByRole('button', { name: 'Create topic' }));
    expect(await screen.findByText('You already have a topic called "garden" (names are unique across areas).')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows any other failure as a form error', async () => {
    createTopic.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection and try again.'));
    render(<NewTopicDialog defaultAreaId={1} onClose={vi.fn()} onCreated={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Name'), 'Garden');
    await userEvent.click(screen.getByRole('button', { name: 'Create topic' }));
    expect(await screen.findByText('Could not reach the server. Check your connection and try again.')).toBeInTheDocument();
  });
  it('never lets submit or Cmd/Ctrl+Enter reach an enclosing form (portal bubbling)', async () => {
    const outerSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const outerKeyDown = vi.fn();
    createTopic.mockResolvedValue({ id: 8, name: 'Garden', area_id: 1 });
    render(
      <form onSubmit={outerSubmit} onKeyDown={outerKeyDown}>
        <NewTopicDialog defaultAreaId={1} onClose={vi.fn()} onCreated={vi.fn()} />
      </form>
    );
    const nameInput = screen.getByLabelText('Name');
    await userEvent.type(nameInput, 'Garden');
    outerKeyDown.mockClear(); // typing bubbles ordinary keys; only the shortcut matters
    fireEvent.keyDown(nameInput, { key: 'Enter', metaKey: true });
    fireEvent.keyDown(nameInput, { key: 'Enter', ctrlKey: true });
    expect(outerKeyDown).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Create topic' }));
    expect(createTopic).toHaveBeenCalledTimes(1);
    expect(outerSubmit).not.toHaveBeenCalled();
  });
});
