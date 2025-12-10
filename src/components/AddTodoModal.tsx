import React, { useState } from 'react';
import { useTodoStore } from '../hooks/useTodoStore';
import { useArea } from '../contexts/AreaContext';
import { useApi } from '../hooks/useApi';
import { useToast } from '../contexts/ToastContext';

interface AddTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTodoAdded: (newTodoId?: number) => void;
  currentView?: string;
  initialData?: {
    title?: string;
    description?: string;
    referenceUrl?: string;
  };
}

const AddTodoModal: React.FC<AddTodoModalProps> = ({ isOpen, onClose, onTodoAdded, currentView, initialData }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isToday, setIsToday] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [referenceUrl, setReferenceUrl] = useState('');
  const [isCategorizing, setIsCategorizing] = useState(false);
  const { createTodo, isCreating } = useTodoStore();
  const { areas } = useArea();
  const apiClient = useApi();
  const { showToast } = useToast();
  const isSubmitting = isCreating || isCategorizing;

  // Initialize form when modal opens - default to NO area selected for AI categorization
  React.useEffect(() => {
    if (isOpen) {
      // Default to null so AI can categorize (per Issue #4)
      setSelectedAreaId(null);
      // Auto-enable "Add to Today List" when on Today tab
      setIsToday(currentView === 'today');
      if (initialData) {
        if (initialData.title) setTitle(initialData.title);
        if (initialData.description) setDescription(initialData.description);
        if (initialData.referenceUrl) setReferenceUrl(initialData.referenceUrl);
      }
    }
  }, [isOpen, currentView, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      let finalAreaId = selectedAreaId;
      let assignedAreaName: string | null = null;

      // If no area selected, use AI categorization
      if (finalAreaId === null && apiClient) {
        setIsCategorizing(true);
        try {
          const categorizationResult = await apiClient.categorizeTodo(
            title.trim(),
            description.trim() || undefined
          );
          
          if (categorizationResult.success && categorizationResult.data.area_id) {
            finalAreaId = categorizationResult.data.area_id;
            assignedAreaName = categorizationResult.data.area_name;
            console.log('AI categorized todo:', {
              area: assignedAreaName,
              confidence: categorizationResult.data.confidence,
              reasoning: categorizationResult.data.reasoning
            });
          }
        } catch (catError) {
          console.warn('AI categorization failed, continuing without area:', catError);
          // Continue with null area - will fall back to default on backend
        } finally {
          setIsCategorizing(false);
        }
      } else if (finalAreaId !== null) {
        // User explicitly selected an area
        assignedAreaName = areas.find(a => a.id === finalAreaId)?.name || null;
      }

      const todoData = {
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
        is_today: isToday,
        area_id: finalAreaId,
        reference_url: referenceUrl.trim() || undefined,
      };

      const newTodo = await createTodo(todoData);
      
      // Reset form
      setTitle('');
      setDescription('');
      setDueDate('');
      setIsToday(false);
      setSelectedAreaId(null);
      setReferenceUrl('');
      
      // Notify parent with the assigned area info
      onTodoAdded(newTodo.id);
      
      // Show toast notification with area assignment
      if (assignedAreaName) {
        showToast({ message: `Todo added to "${assignedAreaName}"`, type: 'success' });
      } else {
        showToast({ message: 'Todo created successfully', type: 'success' });
      }
      
      onClose();
    } catch (error) {
      console.error('Error creating todo:', error);
      // Error handling is done in the store with toast
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTitle('');
      setDescription('');
      setDueDate('');
      setIsToday(false);
      setSelectedAreaId(null);
      setReferenceUrl('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Add New Todo</h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
                disabled={isSubmitting}
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                Use @tags like @work, @priority-1
              </p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional details..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="referenceUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Reference URL
              </label>
              <input
                type="text"
                id="referenceUrl"
                value={referenceUrl}
                onChange={(e) => setReferenceUrl(e.target.value)}
                placeholder="e.g., obsidian://open?vault=MyVault&file=Note.md"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500 mt-1">
                Link to source note or related content
              </p>
            </div>

            <div>
              <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">
                Area
              </label>
              <select
                id="area"
                value={selectedAreaId || ''}
                onChange={(e) => setSelectedAreaId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={isSubmitting}
              >
                <option value="">✨ Auto-categorize with AI</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
              <div className="flex items-center mt-2">
                {selectedAreaId ? (
                  <>
                    <div
                      className="w-3 h-3 rounded-full mr-2 border border-gray-300"
                      style={{ backgroundColor: areas.find(a => a.id === selectedAreaId)?.color || '#6B7280' }}
                    ></div>
                    <span className="text-sm text-gray-600">
                      {areas.find(a => a.id === selectedAreaId)?.name}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-indigo-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                    AI will suggest the best area based on your todo
                  </span>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="datetime-local"
                id="dueDate"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={isSubmitting}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-indigo-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <div>
                  <span className="text-sm font-medium text-gray-900">Add to Today List</span>
                  <p className="text-xs text-gray-500">Mark this todo for today's focus</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isToday}
                  onChange={(e) => setIsToday(e.target.checked)}
                  disabled={isSubmitting}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim() || isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isCategorizing ? 'Categorizing...' : 'Adding...'}
                  </span>
                ) : (
                  'Add Todo'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddTodoModal;
