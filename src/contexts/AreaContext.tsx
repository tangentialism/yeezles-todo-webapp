import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Area, AreaWithStats } from '../types/area';
import { useAreaStore } from '../hooks/useAreaStore';

interface AreaContextType {
  // State
  areas: Area[];
  currentArea: Area | null;
  isLoading: boolean;
  availableColors: string[];
  
  // Actions
  setCurrentArea: (area: Area | null) => void;
  refreshAreas: () => Promise<void>;
  createArea: (name: string, color: string) => Promise<Area | null>;
  updateArea: (id: number, name?: string, color?: string) => Promise<Area | null>;
  deleteArea: (id: number) => Promise<boolean>;
  getAreaStats: (id: number) => Promise<AreaWithStats | null>;
  
  // Store utilities
  getAreaDisplayState: (area: Area) => { isPending: boolean; isDeleting: boolean; isCreating: boolean };
}

const AreaContext = createContext<AreaContextType | undefined>(undefined);

interface AreaProviderProps {
  children: ReactNode;
}

export const AreaProvider: React.FC<AreaProviderProps> = ({ children }) => {
  const [currentArea, setCurrentAreaState] = useState<Area | null>(null);
  
  // Use the optimized area store
  const {
    areas,
    availableColors,
    defaultArea,
    isLoading,
    createArea: storeCreateArea,
    updateArea: storeUpdateArea,
    deleteArea: storeDeleteArea,
    getAreaStats,
    getAreaDisplayState,
    refetchAreas
  } = useAreaStore();

  // Areas are automatically loaded by the store

  // Load saved current area from localStorage
  useEffect(() => {
    const savedAreaId = localStorage.getItem('yeezles-current-area-id');
    if (savedAreaId && areas.length > 0) {
      const savedArea = areas.find(area => area.id === parseInt(savedAreaId));
      if (savedArea) {
        setCurrentAreaState(savedArea);
      } else {
        // If saved area not found, use default area from store
        setCurrentAreaState(defaultArea);
      }
    } else if (areas.length > 0) {
      // No saved area, use default area from store
      setCurrentAreaState(defaultArea);
    }
  }, [areas, defaultArea]);

  const refreshAreas = async (): Promise<void> => {
    await refetchAreas();
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
      const newArea = await storeCreateArea({ name, color });
      return newArea;
    } catch (error) {
      console.error('Error creating area:', error);
      return null;
    }
  };

  const updateArea = async (id: number, name?: string, color?: string): Promise<Area | null> => {
    try {
      const updates: { name?: string; color?: string } = {};
      if (name !== undefined) updates.name = name;
      if (color !== undefined) updates.color = color;

      const updatedArea = await storeUpdateArea(id, updates);
      
      // Update current area if it's the one being updated
      if (currentArea?.id === id) {
        setCurrentAreaState(updatedArea);
      }
      
      return updatedArea;
    } catch (error) {
      console.error('Error updating area:', error);
      return null;
    }
  };

  const deleteArea = async (id: number): Promise<boolean> => {
    try {
      await storeDeleteArea(id);
      
      // If deleted area was current, switch to default area
      if (currentArea?.id === id) {
        const remainingAreas = areas.filter(area => area.id !== id);
        const newDefaultArea = remainingAreas.find(area => area.is_default) || remainingAreas[0];
        setCurrentArea(newDefaultArea || null);
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting area:', error);
      return false;
    }
  };

  // getAreaStats is provided by the store

  // availableColors is provided by the store

  const value: AreaContextType = {
    // State
    areas,
    currentArea,
    isLoading,
    availableColors,
    
    // Actions
    setCurrentArea,
    refreshAreas,
    createArea,
    updateArea,
    deleteArea,
    getAreaStats,
    
    // Store utilities  
    getAreaDisplayState: (area: Area) => {
      const state = getAreaDisplayState(area as any);
      return {
        isPending: state.isPending || false,
        isDeleting: state.isDeleting || false,
        isCreating: state.isCreating || false
      };
    },
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
