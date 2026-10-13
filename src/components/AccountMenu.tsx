import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDismiss } from '../hooks/useDismiss';
import ApiStatus from './ApiStatus';
import { KeyIcon, ShieldIcon, SignOutIcon } from './ui/Icons';
import { menuItem, menuPanel, menuSeparator } from './ui/styles';

/** Props for {@link AccountMenu}. */
interface AccountMenuProps {
  onManagePasskeys: () => void;
  onManageTokens: () => void;
}

/**
 * Avatar button with the account dropdown: who is signed in, passkeys,
 * access tokens and connected apps, API status, and sign out.
 */
const AccountMenu: React.FC<AccountMenuProps> = ({ onManagePasskeys, onManageTokens }) => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setIsOpen(false), []);
  const dismissRefs = useMemo(() => [triggerRef, panelRef], []);
  useDismiss(dismissRefs, close, isOpen);

  const choose = (action: () => void) => () => {
    setIsOpen(false);
    action();
  };

  const initial = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="w-11 h-11 sm:w-10 sm:h-10 rounded-full flex items-center justify-center"
      >
        {/* 44px target on phones around a 32px avatar; 40px avatar from sm up */}
        <span
          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-hover text-[13px] sm:text-sm font-semibold text-ink overflow-hidden flex items-center justify-center transition-shadow ${
            isOpen ? 'ring-[3px] ring-accent/20' : ''
          }`}
        >
          {user?.picture ? (
            <img src={user.picture} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            initial
          )}
        </span>
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          role="menu"
          aria-label="Account"
          className={`absolute right-0 top-[50px] z-30 w-[272px] ${menuPanel}`}
        >
          <div className="px-2.5 pt-2.5 pb-2">
            <div className="text-sm font-medium text-ink truncate">{user?.name}</div>
            <div className="text-[12.5px] text-ink-muted truncate">{user?.email}</div>
          </div>
          <div className={menuSeparator} />
          <button type="button" role="menuitem" onClick={choose(onManagePasskeys)} className={menuItem}>
            <KeyIcon className="w-4 h-4" />
            Manage passkeys
          </button>
          <button type="button" role="menuitem" onClick={choose(onManageTokens)} className={menuItem}>
            <ShieldIcon className="w-4 h-4" />
            Access tokens &amp; apps
          </button>
          <div className={menuSeparator} />
          <ApiStatus />
          <div className={menuSeparator} />
          <button type="button" role="menuitem" onClick={choose(() => logout())} className={menuItem}>
            <SignOutIcon className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
};

export default AccountMenu;
