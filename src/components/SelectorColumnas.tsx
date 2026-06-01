import { useState, useRef, useEffect } from 'react';
import './SelectorColumnas.css';

export interface ColumnaOption {
  id: string;
  label: string;
}

interface SelectorColumnasProps {
  columnas: ColumnaOption[];
  visibleIds: string[];
  onToggle: (columnId: string) => void;
  onRestaurar: () => void;
  titulo?: string;
  /** Texto del botón (ej. "Columnas" o "Filtros") */
  labelBoton?: string;
}

export function SelectorColumnas({
  columnas,
  visibleIds,
  onToggle,
  onRestaurar,
  titulo = 'Columnas visibles',
  labelBoton = 'Columnas',
}: SelectorColumnasProps) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    if (abierto) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [abierto]);

  return (
    <div className="selector-columnas" ref={ref}>
      <button
        type="button"
        className="btn-selector-columnas"
        onClick={() => setAbierto((o) => !o)}
        title={titulo}
        aria-expanded={abierto}
        aria-haspopup="true"
      >
        ⚙️ {labelBoton}
      </button>
      {abierto && (
        <div className="selector-columnas-dropdown" role="dialog" aria-label={titulo}>
          <div className="selector-columnas-header">
            <span>{titulo}</span>
            <button
              type="button"
              className="selector-columnas-restaurar"
              onClick={() => {
                onRestaurar();
                setAbierto(false);
              }}
            >
              Ver todas
            </button>
          </div>
          <ul className="selector-columnas-lista">
            {columnas.map((col) => (
              <li key={col.id}>
                <label className="selector-columnas-label">
                  <input
                    type="checkbox"
                    checked={visibleIds.includes(col.id)}
                    onChange={() => onToggle(col.id)}
                  />
                  <span>{col.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
