import React, { useState, useEffect } from 'react';
import type { Area } from '../types/area';
import { useArea } from '../contexts/AreaContext';
import { logger } from '../utils/logger';
import Dialog from './ui/Dialog';
import { CheckIcon, Spinner, TrashIcon } from './ui/Icons';
import { fieldError, fieldInput, fieldLabel, fieldOptional, ghostButton, primaryButton } from './ui/styles';

/** Props for {@link AreaManagementModal}. */
interface AreaManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When provided, the modal opens in edit mode for this area; otherwise it creates a new one. */
  editingArea?: Area | null;
}

/**
 * Modal for creating or editing an area. Includes name, description (used by AI
 * categorization), and a Material Design color picker. Validates for duplicates
 * and length limits. Non-default areas can also be deleted from this modal.
 */
const AreaManagementModal: React.FC<AreaManagementModalProps> = ({
  isOpen, 
  onClose, 
  editingArea = null 
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('#1976D2'); // Default blue
  const [errors, setErrors] = useState<{ name?: string; color?: string; description?: string }>({});

  const { createArea, updateArea, deleteArea, availableColors, areas, getAreaDisplayState } = useArea();
  
  // Get submission state from context (areas are now managed optimistically)
  const isSubmitting = editingArea ? 
    getAreaDisplayState(editingArea).isPending : 
    false; // For new areas, we'll track locally

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

  // Use colors from context (automatically loaded by store)
  const colorsToUse = availableColors.length > 0 ? availableColors : fallbackColors;

  // Reset form when modal opens/closes or editing area changes
  useEffect(() => {
    if (isOpen) {
      if (editingArea) {
        setName(editingArea.name);
        setDescription(editingArea.description || '');
        setSelectedColor(editingArea.color);
      } else {
        setName('');
        setDescription('');
        setSelectedColor('#1976D2');
      }
      setErrors({});
    }
  }, [isOpen, editingArea]);

  const validateForm = (): boolean => {
    const newErrors: { name?: string; color?: string; description?: string } = {};

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
    } else if (colorsToUse.length > 0 && !colorsToUse.includes(selectedColor)) {
      newErrors.color = 'Please select a valid color';
    }

    // Validate description (optional, max 500 chars)
    if (description && description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const trimmedDescription = description.trim() || null;
      
      if (editingArea) {
        // Update existing area (store handles optimistic updates)
        await updateArea(editingArea.id, name.trim(), selectedColor, trimmedDescription);
        onClose();
      } else {
        // Create new area (store handles optimistic updates)
        await createArea(name.trim(), selectedColor, trimmedDescription);
        onClose();
      }
    } catch (error) {
      logger.error('Error saving area:', error);
      // Error handling is done in the store with toast notifications
    }
  };

  const handleDelete = async () => {
    if (!editingArea) return;

    if (window.confirm(`Are you sure you want to delete "${editingArea.name}"? This action cannot be undone.`)) {
      try {
        // AreaContext.deleteArea returns false when the store refused it (and toasted why)
        const deleted = await deleteArea(editingArea.id);
        if (deleted) onClose();
      } catch (error) {
        logger.error('Error deleting area:', error);
        // Error handling is done in the store with toast notifications
      }
    }
  };

  if (!isOpen) return null;

  const canDelete = Boolean(editingArea && !editingArea.is_default);

  return (
    <Dialog
      title={editingArea ? 'Edit area' : 'New area'}
      titleDotColor={selectedColor}
      onClose={onClose}
      closeDisabled={isSubmitting}
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="px-7 pt-3.5 flex flex-col gap-[18px]">
          <div>
            <label htmlFor="area-name" className={fieldLabel}>
              Name
            </label>
            <input
              type="text"
              id="area-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`${fieldInput} ${errors.name ? '!border-danger/50' : ''}`}
              placeholder="Work, Personal, Side projects"
              maxLength={100}
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'area-name-error' : undefined}
              autoFocus
            />
            {errors.name && (
              <p id="area-name-error" className={fieldError}>
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="area-description" className={fieldLabel}>
              Description <span className={fieldOptional}>optional</span>
            </label>
            <textarea
              id="area-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${fieldInput} resize-none ${errors.description ? '!border-danger/50' : ''}`}
              placeholder="Work projects, reviews and planning"
              rows={2}
              maxLength={500}
              disabled={isSubmitting}
              aria-describedby="area-description-hint"
            />
            <div id="area-description-hint" className="mt-2 flex justify-between gap-4 text-[12.5px]">
              {errors.description ? (
                <span className="text-danger">{errors.description}</span>
              ) : (
                <span className="text-ink-faint">Helps sort incoming todos into this area</span>
              )}
              <span className="flex-none font-mono text-[11.5px] text-ink-faint">{description.length}/500</span>
            </div>
          </div>

          <div>
            <span id="area-colour-label" className={fieldLabel}>
              Colour
            </span>
            <div role="radiogroup" aria-labelledby="area-colour-label" className="flex flex-wrap gap-3 px-0.5 py-1">
              {Array.isArray(colorsToUse) && colorsToUse.map((color) => {
                const isSelected = selectedColor === color;
                return (
                  <button
                    key={color}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={color}
                    onClick={() => setSelectedColor(color)}
                    disabled={isSubmitting}
                    className={`w-9 h-9 rounded-full inline-flex items-center justify-center text-white transition-shadow disabled:opacity-60 ${
                      isSelected ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : 'hover:ring-2 hover:ring-line-strong hover:ring-offset-2'
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    {isSelected && <CheckIcon className="w-4 h-4" />}
                  </button>
                );
              })}
            </div>
            {errors.color && <p className={fieldError}>{errors.color}</p>}
          </div>
        </div>

        <div className="mt-[18px] flex items-center gap-1.5 pl-[18px] pr-5 pt-3.5 pb-5 border-t border-line">
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 h-10 px-3.5 rounded-full text-sm font-medium text-danger hover:bg-danger-soft disabled:opacity-50 transition-colors"
            >
              <TrashIcon className="w-4 h-4" />
              Delete…
            </button>
          )}
          <span className="flex-1" />
          <button type="button" onClick={onClose} disabled={isSubmitting} className={ghostButton}>
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className={primaryButton}>
            {isSubmitting && <Spinner className="w-4 h-4" />}
            {editingArea ? 'Save' : 'Create area'}
          </button>
        </div>
      </form>
    </Dialog>
  );
};

export default AreaManagementModal;
