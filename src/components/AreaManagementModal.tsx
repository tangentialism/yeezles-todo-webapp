import React, { useState, useEffect } from 'react';
import type { Area } from '../types/area';
import { useArea } from '../contexts/AreaContext';

interface AreaManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingArea?: Area | null; // If provided, modal opens in edit mode
}

const AreaManagementModal: React.FC<AreaManagementModalProps> = ({ 
  isOpen, 
  onClose, 
  editingArea = null 
}) => {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#1976D2'); // Default blue
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; color?: string }>({});

  const { createArea, updateArea, deleteArea, getAvailableColors, areas } = useArea();

  // Fallback colors if API fails
  const fallbackColors = [
    '#1976D2', // Blue
    '#388E3C', // Green  
    '#7B1FA2', // Purple
    '#F57C00', // Orange
    '#D32F2F', // Red
    '#00796B', // Teal
    '#303F9F', // Indigo
    '#5D4037'  // Brown
  ];

  // Load available colors on mount
  useEffect(() => {
    const loadColors = async () => {
      const colors = await getAvailableColors();
      if (colors.length > 0) {
        setAvailableColors(colors);
      } else {
        setAvailableColors(fallbackColors);
      }
    };
    loadColors();
  }, [getAvailableColors]);

  // Reset form when modal opens/closes or editing area changes
  useEffect(() => {
    if (isOpen) {
      if (editingArea) {
        setName(editingArea.name);
        setSelectedColor(editingArea.color);
      } else {
        setName('');
        setSelectedColor('#1976D2');
      }
      setErrors({});
    }
  }, [isOpen, editingArea]);

  const validateForm = (): boolean => {
    const newErrors: { name?: string; color?: string } = {};

    // Validate name
    if (!name.trim()) {
      newErrors.name = 'Area name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Area name must be at least 2 characters';
    } else if (name.trim().length > 100) {
      newErrors.name = 'Area name must be 100 characters or less';
    } else {
      // Check for duplicate names (excluding current area if editing)
      const isDuplicate = areas.some(area => 
        area.name.toLowerCase() === name.trim().toLowerCase() && 
        area.id !== editingArea?.id
      );
      if (isDuplicate) {
        newErrors.name = 'An area with this name already exists';
      }
    }

    // Validate color
    if (!selectedColor) {
      newErrors.color = 'Please select a valid color';
    } else if (availableColors.length > 0 && !availableColors.includes(selectedColor)) {
      newErrors.color = 'Please select a valid color';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingArea) {
        // Update existing area
        const result = await updateArea(editingArea.id, name.trim(), selectedColor);
        if (result) {
          onClose();
        }
      } else {
        // Create new area
        const result = await createArea(name.trim(), selectedColor);
        if (result) {
          onClose();
        }
      }
    } catch (error) {
      console.error('Error saving area:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingArea) return;

    if (window.confirm(`Are you sure you want to delete "${editingArea.name}"? This action cannot be undone.`)) {
      setIsSubmitting(true);
      try {
        const success = await deleteArea(editingArea.id);
        if (success) {
          onClose();
        }
      } catch (error) {
        console.error('Error deleting area:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingArea ? 'Edit Area' : 'Create New Area'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          {/* Area Name */}
          <div className="mb-4">
            <label htmlFor="area-name" className="block text-sm font-medium text-gray-700 mb-2">
              Area Name
            </label>
            <input
              type="text"
              id="area-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="e.g., Work, Personal, Side Projects"
              maxLength={100}
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Color Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Choose Color
            </label>
            <div className="grid grid-cols-4 gap-3">
              {Array.isArray(availableColors) && availableColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-12 h-12 rounded-lg border-2 transition-all ${
                    selectedColor === color
                      ? 'border-gray-800 scale-110'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color }}
                  disabled={isSubmitting}
                >
                  {selectedColor === color && (
                    <svg className="w-6 h-6 text-white mx-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
            {errors.color && (
              <p className="mt-2 text-sm text-red-600">{errors.color}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            {editingArea && !editingArea.is_default && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Area
              </button>
            )}
            
            <div className={`flex space-x-3 ${editingArea && !editingArea.is_default ? '' : 'ml-auto'}`}>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                )}
                {editingArea ? 'Update Area' : 'Create Area'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AreaManagementModal;
