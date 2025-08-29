import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Area, AreaWithStats } from '../types/area';
import { useApi } from '../hooks/useApi';
import { useToast } from './ToastContext';

interface AreaContextType {
  // State
  areas: Area[];
  currentArea: Area | null;
  isLoading: boolean;
  
  // Actions
  setCurrentArea: (area: Area | null) => void;
  refreshAreas: () => Promise<void>;
  createArea: (name: string, color: string) => Promise<Area | null>;
  updateArea: (id: number, name?: string, color?: string) => Promise<Area | null>;
  deleteArea: (id: number) => Promise<boolean>;
  getAreaStats: (id: number) => Promise<AreaWithStats | null>;
  getAvailableColors: () => Promise<string[]>;
}

const AreaContext = createContext<AreaContextType | undefined>(undefined);

interface AreaProviderProps {
  children: ReactNode;
}

export const AreaProvider: React.FC<AreaProviderProps> = ({ children }) => {
  const [areas, setAreas] = useState<Area[]>([]);
  const [currentArea, setCurrentAreaState] = useState<Area | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const api = useApi();
  const { showToast } = useToast();

  // Load areas on mount
  useEffect(() => {
    refreshAreas();
  }, []);

  // Load saved current area from localStorage
  useEffect(() => {
    const savedAreaId = localStorage.getItem('yeezles-current-area-id');
    if (savedAreaId && areas.length > 0) {
      const savedArea = areas.find(area => area.id === parseInt(savedAreaId));
      if (savedArea) {
        setCurrentAreaState(savedArea);
      } else {
        // If saved area not found, use first default area
        const defaultArea = areas.find(area => area.is_default) || areas[0];
        setCurrentAreaState(defaultArea || null);
      }
    } else if (areas.length > 0) {
      // No saved area, use first default area
      const defaultArea = areas.find(area => area.is_default) || areas[0];
      setCurrentAreaState(defaultArea || null);
    }
  }, [areas]);

  const refreshAreas = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await api.getAreas();
      if (response.success) {
        setAreas(response.data as Area[]);
      } else {
        showToast(response.message || 'Failed to load areas', 'error');
      }
    } catch (error) {
      console.error('Error loading areas:', error);
      showToast('Failed to load areas', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const setCurrentArea = (area: Area | null): void => {
    setCurrentAreaState(area);
    if (area) {
      localStorage.setItem('yeezles-current-area-id', area.id.toString());
    } else {
      localStorage.removeItem('yeezles-current-area-id');
    }
  };

  const createArea = async (name: string, color: string): Promise<Area | null> => {
    try {
      const response = await api.createArea({ name, color });
      if (response.success) {
        const newArea = response.data;
        setAreas(prev => [...prev, newArea]);
        showToast(`Area "${name}" created successfully`, 'success');
        return newArea;
      } else {
        showToast(response.message || 'Failed to create area', 'error');
        return null;
      }
    } catch (error) {
      console.error('Error creating area:', error);
      showToast('Failed to create area', 'error');
      return null;
    }
  };

  const updateArea = async (id: number, name?: string, color?: string): Promise<Area | null> => {
    try {
      const updates: { name?: string; color?: string } = {};
      if (name !== undefined) updates.name = name;
      if (color !== undefined) updates.color = color;

      const response = await api.updateArea(id, updates);
      if (response.success) {
        const updatedArea = response.data;
        setAreas(prev => prev.map(area => area.id === id ? updatedArea : area));
        
        // Update current area if it's the one being updated
        if (currentArea?.id === id) {
          setCurrentAreaState(updatedArea);
        }
        
        showToast(`Area updated successfully`, 'success');
        return updatedArea;
      } else {
        showToast(response.message || 'Failed to update area', 'error');
        return null;
      }
    } catch (error) {
      console.error('Error updating area:', error);
      showToast('Failed to update area', 'error');
      return null;
    }
  };

  const deleteArea = async (id: number): Promise<boolean> => {
    try {
      const response = await api.deleteArea(id);
      if (response.success) {
        setAreas(prev => prev.filter(area => area.id !== id));
        
        // If deleted area was current, switch to first available area
        if (currentArea?.id === id) {
          const remainingAreas = areas.filter(area => area.id !== id);
          const defaultArea = remainingAreas.find(area => area.is_default) || remainingAreas[0];
          setCurrentArea(defaultArea || null);
        }
        
        showToast('Area deleted successfully', 'success');
        return true;
      } else {
        showToast(response.message || 'Failed to delete area', 'error');
        return false;
      }
    } catch (error) {
      console.error('Error deleting area:', error);
      showToast('Failed to delete area', 'error');
      return false;
    }
  };

  const getAreaStats = async (id: number): Promise<AreaWithStats | null> => {
    try {
      const response = await api.getAreaStats(id);
      if (response.success) {
        return response.data;
      } else {
        showToast(response.message || 'Failed to load area statistics', 'error');
        return null;
      }
    } catch (error) {
      console.error('Error loading area stats:', error);
      showToast('Failed to load area statistics', 'error');
      return null;
    }
  };

  const getAvailableColors = async (): Promise<string[]> => {
    try {
      const response = await api.getAvailableColors();
      if (response.success) {
        return response.data;
      } else {
        showToast(response.message || 'Failed to load available colors', 'error');
        return [];
      }
    } catch (error) {
      console.error('Error loading available colors:', error);
      showToast('Failed to load available colors', 'error');
      return [];
    }
  };

  const value: AreaContextType = {
    // State
    areas,
    currentArea,
    isLoading,
    
    // Actions
    setCurrentArea,
    refreshAreas,
    createArea,
    updateArea,
    deleteArea,
    getAreaStats,
    getAvailableColors,
  };

  return (
    <AreaContext.Provider value={value}>
      {children}
    </AreaContext.Provider>
  );
};

// Custom hook to use the Area context
export const useArea = (): AreaContextType => {
  const context = useContext(AreaContext);
  if (context === undefined) {
    throw new Error('useArea must be used within an AreaProvider');
  }
  return context;
};

export default AreaContext;
