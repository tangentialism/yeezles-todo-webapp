import React, { useEffect, useId, useRef, useState } from 'react';
import Dialog from '../ui/Dialog';
import EditTodoModal from '../EditTodoModal';
import { CheckIcon } from '../ui/Icons';
import { fieldError, fieldHint } from '../ui/styles';
import { useArea } from '../../contexts/AreaContext';
import { useTodoStore } from '../../hooks/useTodoStore';
import { useTodoSearch } from '../../hooks/useTodoSearch';
import { highlightMatches } from '../../utils/highlightMatches';
import type { Todo } from '../../types/todo';

interface SearchPaletteProps {
  onClose: () => void;
}

/**
 * Command-palette todo search. Mounted only while open, so the query and
 * selection start fresh each time. Marking a todo done flips it in place
 * (a local override) instead of refetching, so the list never re-sorts under
 * the cursor; closing the edit dialog refetches.
 */
const SearchPalette: React.FC<SearchPaletteProps> = ({ onClose }) => {
  const [input, setInput] = useState('');
  const { results, query, isFetching, error, refetch } = useTodoSearch(input);
  const { areas } = useArea();
  const { toggleTodoCompletion } = useTodoStore();

  const [selected, setSelected] = useState(0);
  const [overrides, setOverrides] = useState<Map<number, boolean>>(new Map());
  const [editing, setEditing] = useState<Todo | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const optionId = (id: number) => `${listId}-opt-${id}`;

  // Reset the selection when the ordered ids change (not on a same-ids refetch).
  const idsKey = results.map((t) => t.id).join(',');
  const [seenIds, setSeenIds] = useState(idsKey);
  if (seenIds !== idsKey) {
    setSeenIds(idsKey);
    setSelected(0);
  }
  const index = results.length === 0 ? 0 : Math.min(selected, results.length - 1);
  const current: Todo | undefined = results[index];

  useEffect(() => {
    if (typeof document === 'undefined' || !current) return;
    const el = document.getElementById(optionId(current.id));
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const isDone = (todo: Todo) => overrides.get(todo.id) ?? todo.completed;

  const toggle = (todo: Todo) => {
    const done = isDone(todo);
    void toggleTodoCompletion({ ...todo, completed: done });
    setOverrides((prev) => new Map(prev).set(todo.id, !done));
  };

  const closeEditor = () => {
    setEditing(null);
    setOverrides(new Map());
    refetch();
    inputRef.current?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelected(Math.min(index + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelected(Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (!current) return;
      if (event.metaKey || event.ctrlKey) toggle(current);
      else setEditing(current);
    }
  };

  const areaFor = (todo: Todo) => areas.find((a) => a.id === todo.area_id);
  const showHint = query === '' && results.length === 0 && !error;
  const showEmpty = query !== '' && results.length === 0 && !isFetching && !error;

  return (
    <>
      <Dialog title="Search" onClose={onClose} fullScreenOnPhone>
        <div className="px-5 pt-3 pb-2">
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-label="Search todos"
            aria-expanded={results.length > 0}
            aria-controls={listId}
            aria-activedescendant={current ? optionId(current.id) : undefined}
            aria-autocomplete="list"
            autoFocus
            autoComplete="off"
            placeholder="Search todos"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            className="w-full rounded-[10px] border border-line-strong bg-surface px-3 py-2.5 text-[14.5px] leading-[22px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/15"
          />
        </div>

        {showHint && <p className={`${fieldHint} px-7 pb-4`}>Type to search titles, descriptions, people and topics</p>}
        {showEmpty && <p className={`${fieldHint} px-7 pb-4`}>No todos match</p>}
        {error && <p className={`${fieldError} px-7 pb-4`}>Search failed</p>}

        <ul
          id={listId}
          role="listbox"
          aria-label="Search results"
          className="px-2 pb-2 max-h-[60vh] overflow-y-auto"
          // Keep focus in the input when clicking rows and checkboxes.
          onMouseDown={(e) => e.preventDefault()}
        >
          {results.map((todo, i) => {
            const done = isDone(todo);
            const isSelected = i === index;
            const area = areaFor(todo);
            const meta: React.ReactNode[] = [];
            if (area) {
              meta.push(
                <span key="area" className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: area.color }} />
                  <span>{area.name}</span>
                </span>
              );
            }
            if (todo.topic) meta.push(<span key="topic">{todo.topic.name}</span>);
            (todo.people ?? []).forEach((p) => meta.push(<span key={`p${p.id}`}>{p.display_name}</span>));

            return (
              <li
                key={todo.id}
                id={optionId(todo.id)}
                role="option"
                aria-selected={isSelected}
                onClick={() => setEditing(todo)}
                onMouseMove={() => !isSelected && setSelected(i)}
                className={`flex items-start gap-3 px-2.5 py-2 rounded-[9px] cursor-pointer ${isSelected ? 'bg-hover' : ''}`}
              >
                <button
                  type="button"
                  aria-label={done ? 'Mark not done' : 'Mark done'}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(todo);
                  }}
                  className={`mt-0.5 w-[18px] h-[18px] flex-none rounded-full border flex items-center justify-center ${
                    done ? 'bg-ok border-ok text-paper' : 'border-line-strong text-transparent hover:border-ink-faint'
                  }`}
                >
                  <CheckIcon className="w-3 h-3" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className={`text-[14.5px] leading-[22px] ${done ? 'line-through text-ink-faint' : 'text-ink'}`}>
                    {highlightMatches(todo.title, query).map((seg, k) =>
                      seg.match ? (
                        <mark key={k} className="bg-accent-soft text-inherit rounded-sm">{seg.text}</mark>
                      ) : (
                        <React.Fragment key={k}>{seg.text}</React.Fragment>
                      )
                    )}
                  </div>
                  {meta.length > 0 && (
                    <div className={`flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-ink-faint ${done ? 'opacity-70' : ''}`}>
                      {meta.map((m, k) => (
                        <React.Fragment key={k}>
                          {k > 0 && <span aria-hidden="true">·</span>}
                          {m}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
                {isSelected && <span className="hidden sm:block flex-none self-center text-[12px] text-ink-faint">⌘↵ Done</span>}
              </li>
            );
          })}
        </ul>

        <p className="hidden sm:block px-7 py-3 border-t border-line text-[12px] text-ink-faint">
          ↑↓ move · ↵ edit · ⌘↵ mark done · Esc close
        </p>
      </Dialog>

      <EditTodoModal todo={editing} isOpen={editing !== null} onClose={closeEditor} onTodoUpdated={() => undefined} />
    </>
  );
};

export default SearchPalette;
