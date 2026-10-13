import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
