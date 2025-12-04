'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppState, DEFAULT_STATE } from '@/types/flame';

interface FlameContextType {
  state: AppState;
  isHydrated: boolean;
  updateState: (updates: Partial<AppState>) => void;
  updateSection: <K extends keyof AppState>(section: K, updates: Partial<AppState[K]>) => void;
  resetState: () => void;
  replaceState: (newState: AppState) => void;
}

const FlameContext = createContext<FlameContextType | undefined>(undefined);

const STORAGE_KEY = 'flame_app_state';

/**
 * Deep merge two objects. The source object's values take precedence,
 * but the target's structure ensures all default fields are present.
 * Arrays are replaced entirely (not merged element-by-element).
 */
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (sourceValue === undefined) {
      continue;
    }

    // If both are plain objects (not arrays, not null), recurse
    if (
      targetValue !== null &&
      sourceValue !== null &&
      typeof targetValue === 'object' &&
      typeof sourceValue === 'object' &&
      !Array.isArray(targetValue) &&
      !Array.isArray(sourceValue)
    ) {
      result[key] = deepMerge(targetValue as object, sourceValue as object) as T[keyof T];
    } else {
      // For primitives, arrays, or null - use source value directly
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

// Keep a module-level reference to current state for immediate saves
let currentStateRef: AppState = DEFAULT_STATE;

export const FlameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize with DEFAULT_STATE for SSR compatibility (server and client match on first render)
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [isHydrated, setIsHydrated] = useState(false);

  // Keep ref in sync
  useEffect(() => {
    currentStateRef = state;
  }, [state]);

  // Hydrate from localStorage on mount (client-side only, runs after first render)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const merged = deepMerge(DEFAULT_STATE, parsed);
        setState(merged);
        currentStateRef = merged;
      } catch (e) {
        console.error('Failed to load state from localStorage', e);
      }
    }
    setIsHydrated(true);
  }, []);

  // Persist to localStorage on change - save IMMEDIATELY (no debounce for reliability)
  useEffect(() => {
    if (!isHydrated) return; // Don't save until hydrated to avoid overwriting with defaults
    
    const stateToSave = {
      ...state,
      metadata: {
        ...state.metadata,
        lastModified: new Date().toISOString()
      }
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [state, isHydrated]);

  // Save immediately when page loses visibility (user navigates away)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const stateToSave = {
          ...currentStateRef,
          metadata: {
            ...currentStateRef.metadata,
            lastModified: new Date().toISOString()
          }
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      }
    };

    const handleBeforeUnload = () => {
      const stateToSave = {
        ...currentStateRef,
        metadata: {
          ...currentStateRef.metadata,
          lastModified: new Date().toISOString()
        }
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const updateState = useCallback((updates: Partial<AppState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateSection = useCallback(<K extends keyof AppState>(section: K, updates: Partial<AppState[K]>) => {
    setState((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...updates
      }
    }));
  }, []);

  const resetState = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  const replaceState = useCallback((newState: AppState) => {
    setState(newState);
  }, []);

  return (
    <FlameContext.Provider value={{ state, isHydrated, updateState, updateSection, resetState, replaceState }}>
      {children}
    </FlameContext.Provider>
  );
};

export const useFlameStore = () => {
  const context = useContext(FlameContext);
  if (context === undefined) {
    throw new Error('useFlameStore must be used within a FlameProvider');
  }
  return context;
};
