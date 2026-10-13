import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { memo, useState } from 'react';
import { flushSync } from 'react-dom';
import Dialog from '../Dialog';

describe('Dialog: nested', () => {
  it('Escape closes only the topmost dialog', async () => {
    const closeOuter = vi.fn();
    const closeInner = vi.fn();
    render(
      <>
        <Dialog title="New todo" onClose={closeOuter}>outer</Dialog>
        <Dialog title="New topic" onClose={closeInner}>inner</Dialog>
      </>
    );
    await userEvent.keyboard('{Escape}');
    expect(closeInner).toHaveBeenCalledTimes(1);
    expect(closeOuter).not.toHaveBeenCalled();
  });

  it('a single dialog still closes on Escape', async () => {
    const onClose = vi.fn();
    render(<Dialog title="Only" onClose={onClose}>x</Dialog>);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('Dialog: nested, order independence', () => {
  // The outer dialog gets a new onClose on every render (as AddTodoModal does),
  // and the inner really unmounts when it closes.
  // Re-renders on its own, so only the outer dialog re-subscribes.
  const Outer = memo(({ onOuterClose }: { onOuterClose: () => void }) => {
    const [, setTick] = useState(0);
    return (
      <>
        <button type="button" onClick={() => setTick((n) => n + 1)}>rerender</button>
        <Dialog title="Outer" onClose={() => onOuterClose()}>outer</Dialog>
      </>
    );
  });
  Outer.displayName = 'Outer';

  const Harness = ({ onOuterClose, flush = false }: { onOuterClose: () => void; flush?: boolean }) => {
    const [innerOpen, setInnerOpen] = useState(true);
    return (
      <>
        <Outer onOuterClose={onOuterClose} />
        {innerOpen && (
          <Dialog title="Inner" onClose={() => (flush ? flushSync(() => setInnerOpen(false)) : setInnerOpen(false))}>inner</Dialog>
        )}
      </>
    );
  };

  it('after a re-render, one Escape closes only the inner and the next closes the outer', async () => {
    const onOuterClose = vi.fn();
    render(<Harness onOuterClose={onOuterClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'rerender' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('inner')).not.toBeInTheDocument();
    expect(onOuterClose).not.toHaveBeenCalled();
    await userEvent.keyboard('{Escape}');
    expect(onOuterClose).toHaveBeenCalledTimes(1);
  });

  it('does not fall through when the inner unmounts synchronously mid-dispatch', async () => {
    const onOuterClose = vi.fn();
    render(<Harness onOuterClose={onOuterClose} flush />);
    // Re-subscribes the outer listener after the inner one (as a re-render does).
    await userEvent.click(screen.getByRole('button', { name: 'rerender' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('inner')).not.toBeInTheDocument();
    expect(onOuterClose).not.toHaveBeenCalled();
  });

  it('a closeDisabled topmost dialog swallows Escape', async () => {
    const closeOuter = vi.fn();
    const closeInner = vi.fn();
    render(
      <>
        <Dialog title="Outer" onClose={closeOuter}>outer</Dialog>
        <Dialog title="Inner" onClose={closeInner} closeDisabled>inner</Dialog>
      </>
    );
    await userEvent.keyboard('{Escape}');
    expect(closeInner).not.toHaveBeenCalled();
    expect(closeOuter).not.toHaveBeenCalled();
  });
});
