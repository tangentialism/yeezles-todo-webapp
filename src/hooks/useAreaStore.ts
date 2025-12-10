import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useApi } from './useApi';
import { useCrossTabSync } from './useCrossTabSync';
import { useToast } from '../contexts/ToastContext';
import type { Area, AreaWithStats, CreateAreaRequest, UpdateAreaRequest } from '../types/area';

// Query keys for TanStack Query
const QUERY_KEYS = {
  areas: (includeStats?: boolean) => ['areas', { includeStats }],
  area: (id: number) => ['area', id],
  areaStats: (id: number) => ['area', id, 'stats'],
  availableColors: () => ['areas', 'colors'],
} as const;

interface UseAreaStoreOptions {
  includeStats?: boolean;
  enableBackgroundSync?: boolean;
  syncInterval?: number; // in milliseconds, default 60000 (1 minute)
}

interface OptimisticArea extends Area {
  _optimistic?: boolean;
  _pendingAction?: 'create' | 'update' | 'delete';
}

export const useAreaStore = (options: UseAreaStoreOptions = {}) => {
  const { 
    includeStats = false,
    enableBackgroundSync = true, 
    syncInterval = 60000 
  } = options;
  
  const apiClient = useApi();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { broadcast } = useCrossTabSync();

  // Main areas query
  const {
    data: areas = [],
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: QUERY_KEYS.areas(includeStats),
    queryFn: async () => {
      const response = await apiClient.getAreas(includeStats);
      if (!response.success) {
        throw new Error(response.message || 'Failed to load areas');
      }
      
      // Handle both array response and object response from API
      const responseData = response.data as any;
      const areasArray = Array.isArray(responseData) 
        ? responseData 
        : responseData?.areas;
        
      if (!Array.isArray(areasArray)) {
        throw new Error('Invalid areas response format');
      }
      
      return areasArray as Area[];
    },
    staleTime: 30000, // Consider data stale after 30 seconds
    refetchInterval: enableBackgroundSync ? syncInterval : false,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  // Available colors query
  const {
    data: availableColors = [],
    isLoading: isLoadingColors
  } = useQuery({
    queryKey: QUERY_KEYS.availableColors(),
    queryFn: async () => {
      const response = await apiClient.getAvailableColors();
      if (!response.success) {
        throw new Error(response.message || 'Failed to load available colors');
      }
      
      const responseData = response.data as any;
      const colorsData = responseData?.colors;
      
      if (Array.isArray(colorsData)) {
        // Extract hex colors from color objects
        return colorsData.map((colorObj: any) => colorObj.color || colorObj);
      }
      
      return [];
    },
    staleTime: 5 * 60 * 1000, // Colors change rarely, cache for 5 minutes
  });

  // Optimistic update helper
  const updateAreasOptimistically = useCallback(
    (updaterFn: (areas: OptimisticArea[]) => OptimisticArea[]) => {
      queryClient.setQueryData(QUERY_KEYS.areas(includeStats), (old: Area[] = []) => {
        return updaterFn(old as OptimisticArea[]);
      });
    },
    [queryClient, includeStats]
  );

  // Create area mutation
  const createAreaMutation = useMutation({
    mutationFn: async (newArea: CreateAreaRequest) => {
      const response = await apiClient.createArea(newArea);
      if (!response.success) {
        throw new Error(response.message || 'Failed to create area');
      }
      return response.data;
    },
    onMutate: async (newArea) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.areas(includeStats) });

      // Snapshot previous value
      const previousAreas = queryClient.getQueryData<Area[]>(QUERY_KEYS.areas(includeStats));

      // Optimistically update with temporary ID
      const optimisticArea: OptimisticArea = {
        id: Date.now(), // Temporary ID
        user_id: 'temp', // Will be set by server
        name: newArea.name,
        color: newArea.color,
        description: newArea.description || null,
        reference_code: 'temp', // Will be set by server
        is_default: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _optimistic: true,
        _pendingAction: 'create'
      };

      updateAreasOptimistically((areas) => [...areas, optimisticArea]);

      return { previousAreas, optimisticArea };
    },
    onError: (err, _newArea, context) => {
      // Rollback on error
      if (context?.previousAreas) {
        queryClient.setQueryData(QUERY_KEYS.areas(includeStats), context.previousAreas);
      }
      showToast({
        message: `Failed to create area: ${err.message}`,
        type: 'error'
      });
    },
    onSuccess: (data, variables, context) => {
      // Replace optimistic area with real data
      updateAreasOptimistically((areas) =>
        areas.map(area =>
          area.id === context?.optimisticArea.id ? data : area
        )
      );

      // Force a fresh fetch to ensure consistency across all area queries
      queryClient.invalidateQueries({ queryKey: ['areas'] });

      // Broadcast to other tabs
      broadcast('AREA_CREATED', { id: data.id, timestamp: Date.now() });

      showToast({
        message: `Area "${variables.name}" created successfully!`,
        type: 'success'
      });
    },
  });

  // Update area mutation
  const updateAreaMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: UpdateAreaRequest }) => {
      const response = await apiClient.updateArea(id, updates);
      if (!response.success) {
        throw new Error(response.message || 'Failed to update area');
      }
      return response.data;
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.areas(includeStats) });

      const previousAreas = queryClient.getQueryData<Area[]>(QUERY_KEYS.areas(includeStats));

      // Optimistically update
      updateAreasOptimistically((areas) =>
        areas.map(area =>
          area.id === id
            ? { 
                ...area, 
                ...updates, 
                updated_at: new Date().toISOString(),
                _optimistic: true,
                _pendingAction: 'update'
              }
            : area
        )
      );

      return { previousAreas };
    },
    onError: (err, _variables, context) => {
      if (context?.previousAreas) {
        queryClient.setQueryData(QUERY_KEYS.areas(includeStats), context.previousAreas);
      }
      showToast({
        message: `Failed to update area: ${err.message}`,
        type: 'error'
      });
    },
    onSuccess: (data) => {
      // Replace optimistic update with server data
      updateAreasOptimistically((areas) =>
        areas.map(area => area.id === data.id ? { ...data, _optimistic: false } : area)
      );

      // Force a fresh fetch to ensure consistency across all area queries
      queryClient.invalidateQueries({ queryKey: ['areas'] });

      // Broadcast to other tabs
      broadcast('AREA_UPDATED', { id: data.id, timestamp: Date.now() });

      showToast({
        message: 'Area updated successfully!',
        type: 'success'
      });
    },
  });

  // Delete area mutation
  const deleteAreaMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.deleteArea(id);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete area');
      }
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.areas(includeStats) });

      const previousAreas = queryClient.getQueryData<Area[]>(QUERY_KEYS.areas(includeStats));

      // Optimistically mark for deletion
      updateAreasOptimistically((areas) =>
        areas.map(area =>
          area.id === id
            ? { ...area, _optimistic: true, _pendingAction: 'delete' }
            : area
        )
      );

      return { previousAreas };
    },
    onError: (err, _id, context) => {
      if (context?.previousAreas) {
        queryClient.setQueryData(QUERY_KEYS.areas(includeStats), context.previousAreas);
      }
      showToast({
        message: `Failed to delete area: ${err.message}`,
        type: 'error'
      });
    },
    onSuccess: (deletedId) => {
      // Remove from cache with animation
      setTimeout(() => {
        updateAreasOptimistically((areas) =>
          areas.filter(area => area.id !== deletedId)
        );

        // Force a fresh fetch to ensure consistency
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.areas(includeStats) });
      }, 300); // Small delay for any deletion animation

      // Broadcast to other tabs
      broadcast('AREA_DELETED', { id: deletedId, timestamp: Date.now() });

      showToast({
        message: 'Area deleted successfully!',
        type: 'success'
      });
    },
  });

  // Get area statistics
  const getAreaStats = useCallback(async (id: number): Promise<AreaWithStats | null> => {
    try {
      const response = await apiClient.getAreaStats(id);
      if (!response.success) {
        throw new Error(response.message || 'Failed to load area statistics');
      }
      return response.data;
    } catch (error: any) {
      showToast({
        message: `Failed to load area statistics: ${error.message}`,
        type: 'error'
      });
      return null;
    }
  }, [apiClient, showToast]);

  // Helper to get display state for an area (handles pending states)
  const getAreaDisplayState = useCallback((area: OptimisticArea) => {
    return {
      isPending: area._optimistic && area._pendingAction === 'update',
      isDeleting: area._optimistic && area._pendingAction === 'delete',
      isCreating: area._optimistic && area._pendingAction === 'create'
    };
  }, []);

  // Get default area
  const defaultArea = useMemo(() => {
    return areas.find(area => area.is_default) || areas[0] || null;
  }, [areas]);

  // Public interface
  return {
    // Data
    areas: areas as OptimisticArea[],
    availableColors,
    defaultArea,
    isLoading,
    isLoadingColors,
    isRefetching,
    error,

    // Actions
    createArea: createAreaMutation.mutateAsync,
    updateArea: (id: number, updates: UpdateAreaRequest) => 
      updateAreaMutation.mutateAsync({ id, updates }),
    deleteArea: deleteAreaMutation.mutateAsync,
    getAreaStats,
    refetchAreas: refetch,

    // Utilities
    getAreaDisplayState,

    // Mutation states
    isCreating: createAreaMutation.isPending,
    isUpdating: updateAreaMutation.isPending,
    isDeleting: deleteAreaMutation.isPending,

    // Query key for external cache invalidation
    queryKey: QUERY_KEYS.areas(includeStats),
  };
};

export default useAreaStore;