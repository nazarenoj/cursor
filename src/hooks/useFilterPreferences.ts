import { useState, useEffect, useCallback } from 'react';

const STORAGE_PREFIX = 'filter-prefs-';

/**
 * Preferencias de filtros visibles por listado (persistidas en localStorage).
 * Similar a useColumnPreferences pero para qué filtros mostrar en la barra.
 */
export function useFilterPreferences(listKey: string, defaultFilters: string[]) {
  const storageKey = `${STORAGE_PREFIX}${listKey}`;

  const [visibleFilters, setVisibleFiltersState] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return defaultFilters;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(visibleFilters));
    } catch {}
  }, [storageKey, visibleFilters]);

  const setVisibleFilters = useCallback((next: string[] | ((prev: string[]) => string[])) => {
    setVisibleFiltersState((prev) => {
      const arr = typeof next === 'function' ? next(prev) : next;
      try {
        localStorage.setItem(storageKey, JSON.stringify(arr));
      } catch {}
      return arr;
    });
  }, [storageKey]);

  const toggleFilter = useCallback(
    (filterId: string) => {
      setVisibleFilters((prev) => {
        const isVisible = prev.includes(filterId);
        if (isVisible && prev.length <= 1) return prev;
        return isVisible ? prev.filter((f) => f !== filterId) : [...prev, filterId];
      });
    },
    [setVisibleFilters],
  );

  const isFilterVisible = useCallback(
    (filterId: string) => visibleFilters.includes(filterId),
    [visibleFilters],
  );

  return {
    visibleFilters,
    setVisibleFilters,
    toggleFilter,
    isFilterVisible,
  };
}
