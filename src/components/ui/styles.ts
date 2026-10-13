/**
 * Shared Tailwind class strings for recurring surfaces, so menus, buttons and
 * form fields stay consistent across components.
 */

export const menuPanel =
  'bg-surface border border-line rounded-[14px] shadow-menu p-1.5 animate-dropdown-appear';

export const menuItem =
  'flex w-full items-center gap-2.5 min-h-[44px] sm:min-h-[40px] px-2.5 rounded-[9px] text-sm text-left text-ink-2 hover:bg-hover focus:outline-none focus-visible:bg-hover disabled:opacity-50';

export const menuItemDanger =
  'flex w-full items-center gap-2.5 min-h-[44px] sm:min-h-[40px] px-2.5 rounded-[9px] text-sm text-left text-danger hover:bg-danger-soft focus:outline-none focus-visible:bg-danger-soft disabled:opacity-50';

export const menuSeparator = 'h-px bg-line my-1.5 mx-1';

export const primaryButton =
  'inline-flex items-center justify-center gap-2 h-10 px-[18px] rounded-full bg-ink text-paper text-sm font-medium hover:bg-ink-2 disabled:bg-line-strong disabled:text-ink-faint disabled:cursor-not-allowed transition-colors';

export const ghostButton =
  'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full text-sm font-medium text-ink-2 hover:bg-hover disabled:opacity-50 transition-colors';

export const iconButton =
  'inline-flex items-center justify-center w-10 h-10 rounded-full text-ink-faint hover:text-ink hover:bg-hover disabled:opacity-50 transition-colors';

export const fieldLabel = 'block text-[12.5px] font-medium text-ink-2 mb-1.5';

export const fieldOptional = 'font-normal text-ink-faint';

export const fieldInput =
  'w-full rounded-[10px] border border-line-strong bg-surface px-3 py-2.5 text-[14.5px] leading-[22px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/15 disabled:opacity-60';

export const fieldHint = 'mt-2 text-[12.5px] text-ink-faint';
