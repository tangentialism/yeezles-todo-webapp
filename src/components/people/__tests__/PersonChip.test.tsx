import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PersonChip from '../PersonChip';
import { PersonNavigationContext } from '../../../hooks/useOpenPerson';
import { makeTodoPerson } from '../../../test/personFactories';

describe('PersonChip', () => {
  it('renders a plain span without a provider', () => {
    render(<PersonChip person={makeTodoPerson()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Priya Raman').tagName).toBe('SPAN');
  });

  it('is a button inside the provider; clicking opens the person and does not reach the parent', async () => {
    const openPerson = vi.fn();
    const onRowClick = vi.fn();
    render(
      <PersonNavigationContext.Provider value={openPerson}>
        <div onClick={onRowClick}>
          <PersonChip person={makeTodoPerson({ id: 7 })} />
        </div>
      </PersonNavigationContext.Provider>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open person Priya Raman' }));
    expect(openPerson).toHaveBeenCalledWith(7);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('differs in class when linked to Peopler, and says so to screen readers', () => {
    const { container } = render(
      <>
        <PersonChip person={makeTodoPerson({ id: 1, display_name: 'Linked Lee', peopler_id: 9 })} />
        <PersonChip person={makeTodoPerson({ id: 2, display_name: 'Bare Bo' })} />
      </>
    );
    const [linked, bare] = Array.from(container.children);
    expect(linked.className).not.toBe(bare.className);
    expect(linked.className).toContain('bg-accent-soft');
    expect(bare.className).toContain('border-line-strong');
    expect(linked).toHaveTextContent('(in Peopler)');
    expect(bare).not.toHaveTextContent('(in Peopler)');
  });

  it('announces the Peopler link in the button accessible name', () => {
    render(
      <PersonNavigationContext.Provider value={vi.fn()}>
        <PersonChip person={makeTodoPerson({ id: 1, display_name: 'Linked Lee', peopler_id: 9 })} />
        <PersonChip person={makeTodoPerson({ id: 2, display_name: 'Bare Bo' })} />
      </PersonNavigationContext.Provider>
    );
    expect(screen.getByRole('button', { name: 'Open person Linked Lee (in Peopler)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open person Bare Bo' })).toBeInTheDocument();
  });
});
