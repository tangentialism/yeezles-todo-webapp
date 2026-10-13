import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTodoStore } from '../hooks/useTodoStore';
import { useArea } from '../contexts/AreaContext';
import { logger } from '../utils/logger';
import PageShell from './ui/PageShell';
import AreaChips from './ui/AreaChips';
import Checkbox from './ui/Checkbox';
import Switch from './ui/Switch';
import { CircleCheckIcon, FileIcon, Spinner, SunIcon } from './ui/Icons';
import { ghostButton, outlineButton, pageCard, primaryButton, sectionCap } from './ui/styles';

interface ParsedTodo {
  title: string;
  description?: string;
  completed: boolean;
  source_line?: string;
  original_text?: string;
}

/**
 * Batch todo creation page, typically reached via deep-link from Obsidian.
 *
 * Reads a JSON-encoded `todos` array from the URL query string and lets the
 * user select which ones to import, assign an area, and optionally add to Today.
 * After creation, navigates back to the dashboard.
 */
const CreateMultipleTodos: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { createTodo, isCreating } = useTodoStore();
  const { areas, currentArea } = useArea();

  // Parse URL parameters
  const searchParams = new URLSearchParams(location.search);
  const todosParam = searchParams.get('todos');
  const sourceNote = searchParams.get('source_note') || '';
  const vault = searchParams.get('vault') || '';

  // Parse todos from URL parameter
  const [parsedTodos, setParsedTodos] = useState<ParsedTodo[]>([]);
  const [selectedTodos, setSelectedTodos] = useState<Set<number>>(new Set());
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [addToToday, setAddToToday] = useState(false);

  useEffect(() => {
    if (todosParam) {
      try {
        const todos = JSON.parse(todosParam);
        setParsedTodos(todos);
        // Initially select all todos
        setSelectedTodos(new Set((todos as ParsedTodo[]).map((_: ParsedTodo, index: number) => index)));
      } catch (error) {
        logger.error('Failed to parse todos parameter:', error);
      }
    }

    // Initialize with current area
    setSelectedAreaId(currentArea?.id || null);
  }, [todosParam, currentArea]);

  const handleTodoToggle = (index: number) => {
    const newSelected = new Set(selectedTodos);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedTodos(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedTodos(new Set(parsedTodos.map((_, index) => index)));
  };

  const handleDeselectAll = () => {
    setSelectedTodos(new Set());
  };

  const handleCreateTodos = async () => {
    const selectedTodoItems = Array.from(selectedTodos).map(index => parsedTodos[index]);

    try {
      for (const todo of selectedTodoItems) {
        const todoData = {
          title: todo.title,
          description: todo.description || undefined,
          completed: todo.completed,
          is_today: addToToday,
          area_id: selectedAreaId,
        };

        await createTodo(todoData);
      }

      // Navigate back to main dashboard
      navigate('/');
    } catch (error) {
      logger.error('Failed to create todos:', error);
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  if (parsedTodos.length === 0) {
    return (
      <PageShell homeHref="/">
        <main className={`mx-4 sm:mx-auto sm:max-w-[400px] mt-4 sm:mt-12 p-6 sm:p-8 flex flex-col gap-4 ${pageCard}`}>
          <span aria-hidden="true" className="w-10 h-10 rounded-full bg-hover text-ink-muted flex items-center justify-center">
            <FileIcon className="w-[18px] h-[18px]" />
          </span>
          <h1 className="font-serif font-medium text-2xl tracking-[-0.01em] text-ink">Nothing to import</h1>
          <p className="text-[14.5px] text-ink-muted">No todos were found in the link from Obsidian.</p>
          <button type="button" onClick={handleCancel} className={`${outlineButton} self-start`}>
            Back to Yeezles
          </button>
        </main>
      </PageShell>
    );
  }

  const alreadyDone = parsedTodos.filter((todo) => todo.completed).length;
  const selectedCount = selectedTodos.size;

  return (
    <PageShell homeHref="/">
      <main className="max-w-[720px] mx-auto px-5 sm:px-10 pt-4 sm:pt-7 pb-36">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2.5 pb-3 border-b-[1.5px] border-ink">
          <h1 className="font-serif font-medium text-[30px] sm:text-4xl leading-[1.1] tracking-[-0.015em] text-ink">
            Import todos
          </h1>
          <div role="group" aria-label="Totals" className="flex flex-wrap items-baseline gap-x-[18px] gap-y-1 text-[13px] text-ink-muted">
            <span><span className="font-mono font-medium text-ink">{parsedTodos.length}</span> found</span>
            <span><span className="font-mono font-medium text-accent">{selectedCount}</span> selected</span>
            {alreadyDone > 0 && (
              <span><span className="font-mono font-medium text-ink">{alreadyDone}</span> already done</span>
            )}
          </div>
        </div>
        {vault && sourceNote && (
          <p className="mt-3 flex items-center gap-2 text-[13px] text-ink-muted min-w-0">
            <FileIcon className="w-3.5 h-3.5 flex-none" />
            <span className="flex-none">From Obsidian</span>
            <span className="font-mono text-ink-2 truncate">{vault}/{sourceNote}</span>
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span id="import-area-label" className="text-[12.5px] font-medium text-ink-2">
              Area
            </span>
            <AreaChips
              areas={areas}
              value={selectedAreaId}
              onChange={setSelectedAreaId}
              nullLabel="None"
              labelId="import-area-label"
            />
          </div>
          <label htmlFor="addToToday" className="sm:ml-auto flex items-center gap-2.5 min-h-[44px] cursor-pointer">
            <SunIcon className={`w-[18px] h-[18px] ${addToToday ? 'text-accent' : 'text-ink-faint'}`} />
            <span className="text-sm font-medium text-ink">Add to Today</span>
            <Switch id="addToToday" checked={addToToday} onChange={setAddToToday} />
          </label>
        </div>

        <div className="mt-5 flex items-center gap-1 pb-1.5 border-b border-line">
          <h2 className={`${sectionCap} mr-auto`}>Todos</h2>
          <button type="button" onClick={handleSelectAll} className="h-8 px-2.5 rounded-full text-[13px] text-ink-2 hover:bg-hover">
            Select all
          </button>
          <button type="button" onClick={handleDeselectAll} className="h-8 px-2.5 rounded-full text-[13px] text-ink-2 hover:bg-hover">
            None
          </button>
        </div>

        <div role="group" aria-label="Todos to import">
          {parsedTodos.map((todo, index) => {
            const isSelected = selectedTodos.has(index);
            return (
              <label key={index} className="flex items-start gap-3.5 py-3.5 border-b border-line cursor-pointer">
                <span className="mt-0.5">
                  <Checkbox checked={isSelected} onChange={() => handleTodoToggle(index)} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-base leading-[23px] ${isSelected ? 'font-medium text-ink' : 'text-ink-faint'}`}>
                    {todo.title}
                  </span>
                  {todo.description && (
                    <span className="block mt-0.5 text-[13.5px] leading-5 text-ink-muted">{todo.description}</span>
                  )}
                  {todo.completed && (
                    <span className="mt-1 inline-flex items-center gap-1.5 text-[12.5px] text-ink-muted">
                      <CircleCheckIcon className="w-[13px] h-[13px] text-ok" />
                      Already done
                    </span>
                  )}
                </span>
                {todo.source_line && (
                  <span className="flex-none pt-1 font-mono text-[11.5px] text-ink-faint" title={todo.original_text}>
                    <span className="sr-only">Line </span>L{todo.source_line}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </main>

      <div
        className="fixed inset-x-0 bottom-0 z-20 bg-paper/95 backdrop-blur border-t border-line-strong"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="max-w-[720px] mx-auto px-5 sm:px-10 py-3.5 flex items-center gap-1.5">
          <span className="mr-auto text-[13px] text-ink-muted">
            <span className="font-mono font-medium text-ink">{selectedCount}</span> of{' '}
            <span className="font-mono">{parsedTodos.length}</span> selected
          </span>
          <button type="button" onClick={handleCancel} className={ghostButton}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreateTodos}
            disabled={isCreating || selectedCount === 0}
            className={primaryButton}
          >
            {isCreating && <Spinner className="w-4 h-4" />}
            {isCreating ? 'Adding…' : `Add ${selectedCount} ${selectedCount === 1 ? 'todo' : 'todos'}`}
          </button>
        </div>
      </div>
    </PageShell>
  );
};

export default CreateMultipleTodos;