import React from 'react';
import { VIEWS } from './navViews';
import { CircleCheckIcon, FolderIcon, ListIcon, SunIcon } from './ui/Icons';

/** Props for {@link PhoneTabBar}. */
interface PhoneTabBarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  /** Open todos in today's focus, shown beside the Today label. Hidden when 0 or unknown. */
  todayCount?: number | null;
}

const ICONS: Record<(typeof VIEWS)[number]['id'], React.FC<{ className?: string }>> = {
  all: ListIcon,
  today: SunIcon,
  topics: FolderIcon,
  accomplishments: CircleCheckIcon,
};

/**
 * Bottom tab bar for phones (hidden from `sm` up): All / Today / Topics / Done with
 * the icon over the label, full-height targets, and padding for the home
 * indicator (`safe-area-inset-bottom`).
 */
const PhoneTabBar: React.FC<PhoneTabBarProps> = ({ currentView, onViewChange, todayCount }) => (
  <nav
    aria-label="Views"
    className="sm:hidden fixed inset-x-0 bottom-0 z-20 flex px-2 pt-0.5 bg-paper/95 backdrop-blur border-t border-line-strong"
    style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
  >
    {VIEWS.map((view) => {
      const isActive = currentView === view.id;
      const Icon = ICONS[view.id];
      const count = view.id === 'today' && todayCount ? todayCount : null;
      return (
        <button
          key={view.id}
          type="button"
          data-tab={view.id}
          onClick={() => onViewChange(view.id)}
          aria-current={isActive ? 'page' : undefined}
          className={`flex-1 flex flex-col items-center justify-center gap-[3px] min-h-[52px] text-[11.5px] transition-colors ${
            isActive ? 'text-ink font-semibold' : 'text-ink-muted'
          }`}
        >
          <Icon className="w-5 h-5" />
          <span className="inline-flex items-baseline gap-1">
            {view.label}
            {count !== null && (
              <>
                <span aria-hidden="true" className="font-mono text-[10.5px] font-normal tabular-nums text-ink-faint">
                  {count}
                </span>
                <span className="sr-only">({count} open)</span>
              </>
            )}
          </span>
        </button>
      );
    })}
  </nav>
);

export default PhoneTabBar;
