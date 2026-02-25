import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';

/**
 * listKey: identificador del listado (ej. "socios", "categorias", "pagos")
 * defaultColumns: array de ids de columnas por defecto (todas visibles si no hay preferencia guardada)
 */
export function useColumnPreferences(listKey: string, defaultColumns: string[]) {
  const [visibleColumns, setVisibleColumnsState] = useState<string[]>(defaultColumns);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiService
      .getColumnPreferences(listKey)
      .then((res) => {
        if (cancelled) return;
        if (res.columnas && Array.isArray(res.columnas) && res.columnas.length > 0) {
          setVisibleColumnsState(res.columnas);
        } else {
          setVisibleColumnsState(defaultColumns);
        }
      })
      .catch(() => {
        if (!cancelled) setVisibleColumnsState(defaultColumns);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listKey, defaultColumns.join(',')]);

  const setVisibleColumns = useCallback(
    (next: string[] | ((prev: string[]) => string[])) => {
      setVisibleColumnsState((prev) => {
        const arr = typeof next === 'function' ? next(prev) : next;
        apiService.saveColumnPreferences(listKey, arr).catch(() => {});
        return arr;
      });
    },
    [listKey],
  );

  const toggleColumn = useCallback(
    (columnId: string) => {
      setVisibleColumns((prev) => {
        const isVisible = prev.includes(columnId);
        if (isVisible && prev.length <= 1) return prev;
        return isVisible ? prev.filter((c) => c !== columnId) : [...prev, columnId];
      });
    },
    [setVisibleColumns],
  );

  const isColumnVisible = useCallback(
    (columnId: string) => visibleColumns.includes(columnId),
    [visibleColumns],
  );

  return {
    visibleColumns,
    setVisibleColumns,
    toggleColumn,
    isColumnVisible,
    loading,
  };
}
