import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { makePerson, makeTodoPerson } from '../../../test/personFactories';
import { makeCandidate, makeCandidateRef, makeMatchedRef, makeResolvedRef } from '../../../test/proposalFactories';
import type { DraftPersonRef } from '../../../utils/proposalDraft';
import type { RefState } from '../../../types/proposal';

const api = vi.hoisted(() => ({ getPeople: vi.fn(), createPerson: vi.fn() }));
vi.mock('../../../hooks/useApi', () => ({ useApi: () => api }));
vi.mock('../../../hooks/useCrossTabSync', () => ({ useCrossTabSync: () => ({ broadcast: vi.fn() }) }));
vi.mock('../../../hooks/useIsPhone', () => ({ useIsPhone: () => false }));

import ProposalPersonChip from '../ProposalPersonChip';
import Dialog from '../../ui/Dialog';

const draftRef = (resolved: DraftPersonRef['resolved'], extra: Partial<DraftPersonRef> = {}): DraftPersonRef => ({
  key: 'p:n:0',
  resolved,
  chosen: null,
  error: null,
  ...extra,
});

const sam = makeCandidate({ id: 5, display_name: 'Sam Lee', aliases: ['Sammy'], peopler_id: 77, open_count: 2, latest_open_title: 'Book venue' });
const sam2 = makeCandidate({ id: 6, display_name: 'Sam Ortiz', open_count: 0 });

const renderChip = (item: DraftPersonRef, onClose?: () => void) => {
  const onPick = vi.fn();
  const onRemove = vi.fn();
  const chip = <ProposalPersonChip item={item} onPick={onPick} onRemove={onRemove} />;
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {onClose ? <Dialog title="Review" onClose={onClose}>{chip}</Dialog> : chip}
    </QueryClientProvider>
  );
  return { onPick, onRemove };
};

const openChooser = async (name: string) => {
  await userEvent.click(screen.getByRole('button', { name }));
  return screen.getByRole('dialog', { name: /./ });
};
const optionLabels = (dialog: HTMLElement) => within(dialog).getAllByRole('button').map((b) => b.textContent);

beforeEach(() => {
  vi.clearAllMocks();
  api.getPeople.mockResolvedValue([makePerson({ id: 9, display_name: 'Sam Nine' })]);
});

describe('ProposalPersonChip labels', () => {
  it('matched shows the name, linked or bare', () => {
    renderChip(draftRef(makeMatchedRef(1, 'Priya Raman')));
    expect(screen.getByText('Priya Raman').className).toContain('border-line-strong');
  });

  it('matched linked uses the filled look', () => {
    renderChip(draftRef(makeResolvedRef({ person: makeTodoPerson({ peopler_id: 4 }) })));
    expect(screen.getByText('Priya Raman').className).toContain('bg-accent-soft');
  });

  it('matched_by_name', () => {
    renderChip(draftRef(makeResolvedRef({ state: 'matched_by_name', name: 'Priya' })));
    expect(screen.getByText('Priya · by name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remove Priya/ })).toBeInTheDocument();
  });

  it('new_confirmed', () => {
    renderChip(draftRef(makeCandidateRef('new_confirmed', 'Dana')));
    expect(screen.getByText('+ Dana · new, you confirmed in chat').className).toContain('border-ok');
  });

  it.each(['new', 'ambiguous', 'link_candidate', 'possible_match', 'gone'] as const)('%s is a needs-you button', (state) => {
    renderChip(draftRef(makeCandidateRef(state, 'Sam')));
    const button = screen.getByRole('button', { name: '? Sam' });
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    expect(button.className).toContain('border-dashed');
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument();
  });

  it('a chip with an error is needs-you and shows the error as an alert', () => {
    renderChip(draftRef(makeMatchedRef(1, 'Priya Raman'), { error: 'Person not found' }));
    expect(screen.getByRole('button', { name: '? Priya Raman' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Person not found');
  });

  it('a chosen chip renders as its pick with a remove button', () => {
    renderChip(draftRef(makeCandidateRef('new', 'Dana'), { chosen: { kind: 'create', name: 'Dana' } }));
    expect(screen.getByText('+ Dana · new').className).toContain('border-ok');
    expect(screen.getByRole('button', { name: /Remove/ })).toBeInTheDocument();
  });

  it('a chosen person pick shows that person', () => {
    renderChip(draftRef(makeCandidateRef('ambiguous', 'Sam'), { chosen: { kind: 'person', person: makeTodoPerson({ id: 5, display_name: 'Sam Lee' }) } }));
    expect(screen.getByText('Sam Lee')).toBeInTheDocument();
  });

  it('the remove button calls onRemove', async () => {
    const { onRemove } = renderChip(draftRef(makeMatchedRef(1, 'Priya Raman')));
    await userEvent.click(screen.getByRole('button', { name: 'Remove Priya Raman' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});

describe('PersonChooser options', () => {
  it('new', async () => {
    renderChip(draftRef(makeCandidateRef('new', 'Dana')));
    const dialog = await openChooser('? Dana');
    expect(within(dialog).getByText("Dana isn't one of your people.")).toBeInTheDocument();
    expect(optionLabels(dialog)).toEqual(['Create "Dana"', 'Pick someone…', 'Drop']);
  });

  it('ambiguous', async () => {
    renderChip(draftRef(makeResolvedRef({ ref: { name: 'Sam' }, state: 'ambiguous', name: 'Sam', person: null, candidates: [sam, sam2] })));
    const dialog = await openChooser('? Sam');
    expect(within(dialog).getByText('More than one person is called Sam.')).toBeInTheDocument();
    expect(optionLabels(dialog)).toEqual([
      'Sam Lee (Sammy) · in Peopler · 2 open · latest "Book venue"',
      'Sam Ortiz · 0 open',
      'New "Sam"',
      'Drop',
    ]);
  });

  it('link candidate', async () => {
    renderChip(
      draftRef(makeResolvedRef({ ref: { peopler_id: 77, name: 'Sam Lee' }, state: 'link_candidate', name: 'Sam Lee', person: null, candidates: [sam] }))
    );
    const dialog = await openChooser('? Sam Lee');
    expect(within(dialog).getByText('Sam Lee in Peopler may be someone you already have.')).toBeInTheDocument();
    expect(optionLabels(dialog)).toEqual(['Link Sam Lee to Peopler', 'Just tag Sam Lee', 'New linked person', 'Drop']);
  });

  it('possible match', async () => {
    renderChip(draftRef(makeCandidateRef('possible_match', 'Sam')));
    const dialog = await openChooser('? Sam');
    expect(within(dialog).getByText('Sam is close to someone you already have.')).toBeInTheDocument();
    expect(optionLabels(dialog)).toEqual(['Sam Lee · 0 open', 'New "Sam"', 'Drop']);
  });

  it('gone', async () => {
    renderChip(draftRef(makeCandidateRef('gone', 'person 9')));
    const dialog = await openChooser('? person 9');
    expect(within(dialog).getByText('This person no longer exists.')).toBeInTheDocument();
    expect(optionLabels(dialog)).toEqual(['Drop']);
  });
});

describe('PersonChooser picks', () => {
  const asPerson = { id: 5, display_name: 'Sam Lee', peopler_id: 77, peopler_url: null };

  it('Create carries no peopler_id for a plain name', async () => {
    const { onPick } = renderChip(draftRef(makeCandidateRef('new', 'Dana')));
    await openChooser('? Dana');
    await userEvent.click(screen.getByRole('button', { name: 'Create "Dana"' }));
    expect(onPick).toHaveBeenCalledWith({ kind: 'create', name: 'Dana' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Create carries the ref peopler_id (P6)', async () => {
    const { onPick } = renderChip(draftRef(makeResolvedRef({ ref: { peopler_id: 12, name: 'Dana' }, state: 'new', name: 'Dana', person: null })));
    await openChooser('? Dana');
    await userEvent.click(screen.getByRole('button', { name: 'Create "Dana"' }));
    expect(onPick).toHaveBeenCalledWith({ kind: 'create', name: 'Dana', peopler_id: 12 });
  });

  it('Drop', async () => {
    const { onPick } = renderChip(draftRef(makeCandidateRef('gone', 'person 9')));
    await openChooser('? person 9');
    await userEvent.click(screen.getByRole('button', { name: 'Drop' }));
    expect(onPick).toHaveBeenCalledWith({ kind: 'drop' });
  });

  it('a candidate line picks that person (P1)', async () => {
    const { onPick } = renderChip(draftRef(makeCandidateRef('ambiguous', 'Sam')));
    await openChooser('? Sam');
    await userEvent.click(screen.getByRole('button', { name: /^Sam Lee/ }));
    expect(onPick).toHaveBeenCalledWith({ kind: 'person', person: { id: 5, display_name: 'Sam Lee', peopler_id: null, peopler_url: null } });
  });

  it('New "<name>" carries the ref peopler_id', async () => {
    const { onPick } = renderChip(draftRef(makeResolvedRef({ ref: { peopler_id: 3, name: 'Sam' }, state: 'ambiguous', name: 'Sam', person: null, candidates: [sam] })));
    await openChooser('? Sam');
    await userEvent.click(screen.getByRole('button', { name: 'New "Sam"' }));
    expect(onPick).toHaveBeenCalledWith({ kind: 'create', name: 'Sam', peopler_id: 3 });
  });

  describe('link candidate', () => {
    const linkRef = () =>
      draftRef(makeResolvedRef({ ref: { peopler_id: 77, name: 'Sam Lee' }, state: 'link_candidate' as RefState, name: 'Sam Lee', person: null, candidates: [sam] }));

    it('Link', async () => {
      const { onPick } = renderChip(linkRef());
      await openChooser('? Sam Lee');
      await userEvent.click(screen.getByRole('button', { name: 'Link Sam Lee to Peopler' }));
      expect(onPick).toHaveBeenCalledWith({ kind: 'link', person: asPerson, peopler_id: 77 });
    });

    it('Just tag', async () => {
      const { onPick } = renderChip(linkRef());
      await openChooser('? Sam Lee');
      await userEvent.click(screen.getByRole('button', { name: 'Just tag Sam Lee' }));
      expect(onPick).toHaveBeenCalledWith({ kind: 'person', person: asPerson });
    });

    it('New linked person', async () => {
      const { onPick } = renderChip(linkRef());
      await openChooser('? Sam Lee');
      await userEvent.click(screen.getByRole('button', { name: 'New linked person' }));
      expect(onPick).toHaveBeenCalledWith({ kind: 'create', name: 'Sam Lee', peopler_id: 77 });
    });
  });

  it('Pick someone… reveals the compact field and picks a person', async () => {
    const { onPick } = renderChip(draftRef(makeCandidateRef('new', 'Dana')));
    const dialog = await openChooser('? Dana');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Pick someone…' }));
    expect(within(dialog).queryByText('optional')).not.toBeInTheDocument();
    await userEvent.type(within(dialog).getByRole('combobox'), 'sam');
    await userEvent.click(await screen.findByRole('option', { name: 'Sam Nine' }));
    expect(onPick).toHaveBeenCalledWith({ kind: 'person', person: { id: 9, display_name: 'Sam Nine', peopler_id: null, peopler_url: null } });
  });
});

describe('PersonChooser dismissal', () => {
  it('Escape closes the chooser only and returns focus to the chip', async () => {
    const onClose = vi.fn();
    renderChip(draftRef(makeCandidateRef('new', 'Dana')), onClose);
    await userEvent.click(screen.getByRole('button', { name: '? Dana' }));
    expect(screen.getByRole('dialog', { name: "Dana isn't one of your people." })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: "Dana isn't one of your people." })).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '? Dana' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('an outside click closes the chooser', async () => {
    renderChip(draftRef(makeCandidateRef('new', 'Dana')));
    await userEvent.click(screen.getByRole('button', { name: '? Dana' }));
    await userEvent.click(document.body);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('a second click on the chip closes it', async () => {
    renderChip(draftRef(makeCandidateRef('new', 'Dana')));
    await userEvent.click(screen.getByRole('button', { name: '? Dana' }));
    await userEvent.click(screen.getByRole('button', { name: '? Dana' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
