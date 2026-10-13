import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useArea } from '../contexts/AreaContext';
import { useDismiss } from '../hooks/useDismiss';
import AreaManagementModal from './AreaManagementModal';
import type { Area } from '../types/area';
import { NEW_AREA_HIGHLIGHT_MS } from '../constants';
import { CheckIcon, ChevronDownIcon, PencilIcon, PlusIcon, Spinner } from './ui/Icons';
import { menuItem, menuPanel, menuSeparator } from './ui/styles';

/** Props for {@link Navigation}. */
interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

const VIEWS = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'accomplishments', label: 'Done' },
];

/** Multi-colour swatch shown for "All areas". */
const ALL_AREAS_SWATCH = 'conic-gradient(#1E88E5 0 33%, #43A047 0 66%, #8E24AA 0)';

/**
 * Header navigation: the All / Today / Done view tabs and the area switcher
 * pill with its dropdown (pick, edit or create an area). Newly created areas
 * are briefly highlighted in the dropdown.
 */
const Navigation: React.FC<NavigationProps> = ({ currentView, onViewChange }) => {
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
    <div className="flex flex-1 flex-wrap items-center gap-x-8 gap-y-3 min-w-0">
      <nav aria-label="Views" className="flex gap-6">
        {VIEWS.map((view) => {
          const isActive = currentView === view.id;
          return (
            <button
              key={view.id}
              type="button"
              data-tab={view.id}
              onClick={() => onViewChange(view.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`py-2.5 px-0.5 text-sm border-b-[1.5px] transition-colors ${
                isActive
                  ? 'border-ink text-ink'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {view.label}
            </button>
          );
        })}
      </nav>

      <span className="flex-1" />

      {/* Area Switcher */}
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsAreaDropdownOpen(!isAreaDropdownOpen)}
          disabled={isLoading}
          aria-haspopup="menu"
          aria-expanded={isAreaDropdownOpen}
          className={`inline-flex items-center gap-2 h-10 px-3.5 rounded-full border bg-surface text-sm text-ink-2 transition-[border-color,box-shadow] ${
            isAreaDropdownOpen
              ? 'border-accent ring-[3px] ring-accent/15'
              : 'border-line-strong hover:border-ink-faint'
          }`}
        >
          {isLoading ? (
            <Spinner className="w-4 h-4 text-ink-faint" />
          ) : (
            <>
              <span
                className="w-2 h-2 rounded-full flex-none"
                style={{ background: currentArea?.color || ALL_AREAS_SWATCH }}
              />
              <span>{currentArea ? currentArea.name : 'All Areas'}</span>
              <ChevronDownIcon
                className={`w-3.5 h-3.5 transition-transform ${isAreaDropdownOpen ? 'rotate-180' : ''}`}
              />
            </>
          )}
        </button>

        {isAreaDropdownOpen && (
          <div
            ref={panelRef}
            role="menu"
            aria-label="Areas"
            className={`absolute right-0 top-[50px] z-30 w-64 ${menuPanel}`}
          >
            <button
              type="button"
              role="menuitemradio"
              aria-checked={!currentArea}
              onClick={() => handleAreaChange(null)}
              className={menuItem}
            >
              <span className="w-2 h-2 rounded-full flex-none" style={{ background: ALL_AREAS_SWATCH }} />
              <span className="flex-1">All Areas</span>
              {!currentArea && <CheckIcon className="w-4 h-4 text-accent" />}
            </button>

            <div className={menuSeparator} />

            {Array.isArray(areas) && areas.map((area) => {
              const isSelected = currentArea?.id === area.id;
              const isNewlyCreated = newlyCreatedAreaId === area.id;
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
                    onClick={() => handleAreaChange(area.id)}
                    className={`${menuItem} flex-1`}
                  >
                    <span className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: area.color }} />
                    <span className="flex-1">{area.name}</span>
                    {area.is_default && (
                      <span className="text-xs text-ink-faint">default</span>
                    )}
                    {isSelected && <CheckIcon className="w-4 h-4 text-accent" />}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openAreaModal(area);
                    }}
                    className="ml-0.5 w-8 h-8 inline-flex items-center justify-center rounded-[7px] text-ink-faint hover:text-ink hover:bg-hover opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
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
              onClick={() => openAreaModal(null)}
              className={`${menuItem} text-ink-muted`}
            >
              <PlusIcon className="w-4 h-4" />
              New area
            </button>
          </div>
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
