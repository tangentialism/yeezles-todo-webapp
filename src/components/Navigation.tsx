import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useArea } from '../contexts/AreaContext';
import { useDismiss } from '../hooks/useDismiss';
import { useAreaOpenCounts } from '../hooks/useNavCounts';
import AreaManagementModal from './AreaManagementModal';
import { ALL_AREAS_SWATCH, VIEWS } from './navViews';
import type { Area } from '../types/area';
import { NEW_AREA_HIGHLIGHT_MS } from '../constants';
import { CheckIcon, ChevronDownIcon, PencilIcon, PlusIcon, Spinner } from './ui/Icons';
import { menuItem, menuPanel, menuSeparator } from './ui/styles';

/** Props for {@link Navigation}. */
interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
  /** Open todos in today's focus, shown beside the Today tab. Hidden when 0 or unknown. */
  todayCount?: number | null;
}

/** Small mono figure used for counts in tabs and menus. */
const Count: React.FC<{ value: number; className?: string }> = ({ value, className = '' }) => (
  <span aria-hidden="true" className={`font-mono text-[11.5px] tabular-nums text-ink-faint ${className}`}>
    {value}
  </span>
);

/** Right edge of an area row: the open count, then a fixed slot for the tick, so both line up. */
const Trailing: React.FC<{ count: number | undefined; selected: boolean }> = ({ count, selected }) => (
  <>
    {count !== undefined && <Count value={count} className="min-w-[2ch] text-right" />}
    <span className="w-4 h-4 flex-none">{selected && <CheckIcon className="w-4 h-4 text-accent" />}</span>
  </>
);

/** Props for {@link AreaMenu}. */
interface AreaMenuProps {
  panelRef: React.RefObject<HTMLDivElement | null>;
  newlyCreatedAreaId: number | null;
  onPick: (areaId: number | null) => void;
  onEdit: (area: Area | null) => void;
}

/**
 * The area dropdown panel. Mounted only while open, so its open-todo counts
 * are fetched once per opening (see {@link useAreaOpenCounts}).
 */
const AreaMenu: React.FC<AreaMenuProps> = ({ panelRef, newlyCreatedAreaId, onPick, onEdit }) => {
  const { areas, currentArea } = useArea();
  const counts = useAreaOpenCounts();
  const countLabel = (n: number | undefined) => (n === undefined ? '' : `, ${n} open`);

  return (
    <div
      ref={panelRef}
      role="menu"
      aria-label="Areas"
      className={`absolute right-0 top-[50px] z-30 w-64 ${menuPanel}`}
    >
      <div className="flex items-center">
        <button
          type="button"
          role="menuitemradio"
          aria-checked={!currentArea}
          aria-label={`All Areas${countLabel(counts?.total)}`}
          onClick={() => onPick(null)}
          className={`${menuItem} flex-1`}
        >
          <span className="w-2 h-2 rounded-full flex-none" style={{ background: ALL_AREAS_SWATCH }} />
          <span className="flex-1">All Areas</span>
          <Trailing count={counts?.total} selected={!currentArea} />
        </button>
        {/* Keeps counts and ticks in one column with the area rows' edit buttons */}
        <span aria-hidden="true" className="ml-0.5 w-8 flex-none" />
      </div>

      <div className={menuSeparator} />

      {Array.isArray(areas) && areas.map((area) => {
        const isSelected = currentArea?.id === area.id;
        const isNewlyCreated = newlyCreatedAreaId === area.id;
        const open = counts?.byArea.get(area.id);
        return (
          <div
            key={area.id}
            className={`group flex items-center rounded-[9px] transition-colors ${
              isNewlyCreated ? 'bg-accent-soft' : ''
            }`}
          >
            <button
              type="button"
              role="menuitemradio"
              aria-checked={isSelected}
              aria-label={`${area.name}${countLabel(open)}`}
              onClick={() => onPick(area.id)}
              className={`${menuItem} flex-1`}
            >
              <span className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: area.color }} />
              <span className="flex-1 truncate">{area.name}</span>
              <Trailing count={open} selected={isSelected} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(area);
              }}
              className="ml-0.5 w-8 h-8 inline-flex items-center justify-center rounded-[7px] text-ink-faint hover:text-ink hover:bg-hover opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity"
              title="Edit area"
              aria-label={`Edit ${area.name}`}
            >
              <PencilIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}

      <div className={menuSeparator} />

      <button
        type="button"
        role="menuitem"
        onClick={() => onEdit(null)}
        className={`${menuItem} text-ink-muted`}
      >
        <PlusIcon className="w-4 h-4" />
        New area
      </button>
    </div>
  );
};

/**
 * Header navigation: the All / Today / Done view tabs (from `sm` up; phones
 * use {@link PhoneTabBar}) and the area switcher with its dropdown (pick,
 * edit or create an area, with open counts). On phones the switcher shrinks
 * to its colour dot. Newly created areas are briefly highlighted.
 */
const Navigation: React.FC<NavigationProps> = ({ currentView, onViewChange, todayCount }) => {
  const [isAreaDropdownOpen, setIsAreaDropdownOpen] = useState(false);
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [newlyCreatedAreaId, setNewlyCreatedAreaId] = useState<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { areas, currentArea, setCurrentArea, isLoading } = useArea();

  const closeDropdown = useCallback(() => setIsAreaDropdownOpen(false), []);
  const dismissRefs = useMemo(() => [triggerRef, panelRef], []);
  useDismiss(dismissRefs, closeDropdown, isAreaDropdownOpen);

  // Track newly created areas for the highlight
  const prevAreasLength = useRef(areas.length);
  useEffect(() => {
    if (areas.length > prevAreasLength.current && areas.length > 0) {
      const latestArea = areas[areas.length - 1];
      setNewlyCreatedAreaId(latestArea.id);

      const timer = setTimeout(() => {
        setNewlyCreatedAreaId(null);
      }, NEW_AREA_HIGHLIGHT_MS);

      return () => clearTimeout(timer);
    }
    prevAreasLength.current = areas.length;
  }, [areas]);

  const handleAreaChange = (areaId: number | null) => {
    const selectedArea = areaId && Array.isArray(areas)
      ? areas.find(area => area.id === areaId) || null
      : null;
    setCurrentArea(selectedArea);
    setIsAreaDropdownOpen(false);
  };

  const openAreaModal = (area: Area | null) => {
    setEditingArea(area);
    setIsAreaModalOpen(true);
    setIsAreaDropdownOpen(false);
  };

  return (
    <div className="flex flex-1 items-center gap-x-8 min-w-0">
      <nav aria-label="Views" className="hidden sm:flex gap-6">
        {VIEWS.map((view) => {
          const isActive = currentView === view.id;
          const count = view.id === 'today' && todayCount ? todayCount : null;
          return (
            <button
              key={view.id}
              type="button"
              data-tab={view.id}
              onClick={() => onViewChange(view.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`inline-flex items-center gap-1.5 py-2.5 px-0.5 text-sm border-b-[1.5px] transition-colors ${
                isActive
                  ? 'border-ink text-ink'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {view.label}
              {count !== null && (
                <>
                  <Count value={count} />
                  <span className="sr-only">({count} open)</span>
                </>
              )}
            </button>
          );
        })}
      </nav>

      <span className="flex-1" />

      {/* Area switcher: a pill from sm up, just the colour dot on phones */}
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsAreaDropdownOpen(!isAreaDropdownOpen)}
          disabled={isLoading}
          aria-haspopup="menu"
          aria-expanded={isAreaDropdownOpen}
          className={`inline-flex items-center justify-center w-11 h-11 rounded-full transition-[background-color,border-color,box-shadow] sm:w-auto sm:h-10 sm:gap-2 sm:px-3.5 sm:border sm:bg-surface text-sm text-ink-2 ${
            isAreaDropdownOpen
              ? 'bg-hover sm:border-accent sm:ring-[3px] sm:ring-accent/15'
              : 'sm:border-line-strong sm:hover:border-ink-faint'
          }`}
        >
          {isLoading ? (
            <Spinner className="w-4 h-4 text-ink-faint" />
          ) : (
            <>
              <span
                className="w-3 h-3 sm:w-2 sm:h-2 rounded-full flex-none"
                style={{ background: currentArea?.color || ALL_AREAS_SWATCH }}
              />
              <span className="sr-only sm:not-sr-only">
                {currentArea ? currentArea.name : 'All Areas'}
              </span>
              <ChevronDownIcon
                className={`hidden sm:block w-3.5 h-3.5 transition-transform ${isAreaDropdownOpen ? 'rotate-180' : ''}`}
              />
            </>
          )}
        </button>

        {isAreaDropdownOpen && (
          <AreaMenu
            panelRef={panelRef}
            newlyCreatedAreaId={newlyCreatedAreaId}
            onPick={handleAreaChange}
            onEdit={openAreaModal}
          />
        )}
      </div>

      <AreaManagementModal
        isOpen={isAreaModalOpen}
        onClose={() => {
          setIsAreaModalOpen(false);
          setEditingArea(null);
        }}
        editingArea={editingArea}
      />
    </div>
  );
};

export default Navigation;
