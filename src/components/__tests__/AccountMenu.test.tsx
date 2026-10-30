import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Priya Raman', email: 'priya@example.test' }, logout: vi.fn() }),
}));
vi.mock('../ApiStatus', () => ({ default: () => <div>api status</div> }));

import AccountMenu from '../AccountMenu';

const setup = () => {
  const handlers = { onManagePasskeys: vi.fn(), onManageTokens: vi.fn(), onManagePeopler: vi.fn() };
  render(<AccountMenu {...handlers} />);
  return handlers;
};
const open = () => userEvent.click(screen.getByRole('button', { name: 'Account menu' }));

describe('AccountMenu', () => {
  it('lists Peopler after Access tokens & apps', async () => {
    setup();
    await open();
    const names = screen.getAllByRole('menuitem').map((el) => el.textContent);
    expect(names).toEqual(['Manage passkeys', 'Access tokens & apps', 'Peopler', 'Sign out']);
  });

  it('closes the menu and calls onManagePeopler', async () => {
    const h = setup();
    await open();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Peopler' }));
    expect(h.onManagePeopler).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('leaves passkeys and tokens unchanged', async () => {
    const h = setup();
    await open();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Manage passkeys' }));
    expect(h.onManagePasskeys).toHaveBeenCalledTimes(1);
    await open();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Access tokens & apps' }));
    expect(h.onManageTokens).toHaveBeenCalledTimes(1);
    expect(h.onManagePeopler).not.toHaveBeenCalled();
  });
});
