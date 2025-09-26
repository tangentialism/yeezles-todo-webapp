import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTodoStore } from '../hooks/useTodoStore';
import { useArea } from '../contexts/AreaContext';

interface ParsedTodo {
  title: string;
  description?: string;
  completed: boolean;
  source_line?: string;
  original_text?: string;
}

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
        setSelectedTodos(new Set(todos.map((_: any, index: number) => index)));
      } catch (error) {
        console.error('Failed to parse todos parameter:', error);
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
      console.error('Failed to create todos:', error);
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  if (parsedTodos.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Create Multiple Todos</h1>
            <p className="text-gray-600">No todos found in the provided data.</p>
            <button
              onClick={handleCancel}
              className="mt-4 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Create Multiple Todos from Obsidian</h1>
            {vault && sourceNote && (
              <p className="text-sm text-gray-600 mt-2">
                From: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{vault}/{sourceNote}</span>
              </p>
            )}
            <p className="text-sm text-gray-600 mt-2">
              Found {parsedTodos.length} todo(s). Select which ones to create:
            </p>
          </div>

          {/* Global settings */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Global Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-2">
                  Area/Project (applies to all selected todos)
                </label>
                <select
                  id="area"
                  value={selectedAreaId || ''}
                  onChange={(e) => setSelectedAreaId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">No area</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="addToToday"
                  checked={addToToday}
                  onChange={(e) => setAddToToday(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="addToToday" className="ml-2 block text-sm text-gray-900">
                  Add all selected todos to Today's Focus List
                </label>
              </div>
            </div>
          </div>

          {/* Selection controls */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex space-x-2">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Deselect All
              </button>
            </div>
            <span className="text-sm text-gray-600">
              {selectedTodos.size} of {parsedTodos.length} selected
            </span>
          </div>

          {/* Todo list */}
          <div className="space-y-3 mb-6">
            {parsedTodos.map((todo, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${
                  selectedTodos.has(index) ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedTodos.has(index)}
                    onChange={() => handleTodoToggle(index)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-1"
                  />
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-900">{todo.title}</h4>
                    {todo.description && (
                      <p className="text-gray-600 text-sm mt-1">{todo.description}</p>
                    )}
                    {todo.source_line && (
                      <p className="text-xs text-gray-500 mt-2">
                        Line {todo.source_line}: <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">{todo.original_text}</span>
                      </p>
                    )}
                    {todo.completed && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-2">
                        Already completed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateTodos}
              disabled={isCreating || selectedTodos.size === 0}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating...' : `Create ${selectedTodos.size} Todo(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateMultipleTodos;