import { useState, useRef, useEffect } from 'react';
import './SelectorFiltros.css';

export interface FiltroOption {
  id: string;
  label: string;
}

interface SelectorFiltrosProps {
  filtros: FiltroOption[];
  visibleIds: string[];
  onToggle: (filterId: string) => void;
  onRestaurar: () => void;
  titulo?: string;
}

export function SelectorFiltros({
  filtros,
  visibleIds,
  onToggle,
  onRestaurar,
  titulo = 'Filtros visibles',
}: SelectorFiltrosProps) {
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
    <div className="selector-filtros" ref={ref}>
      <button
        type="button"
        className="btn-selector-filtros"
        onClick={() => setAbierto((o) => !o)}
        title="Seleccionar filtros visibles"
        aria-expanded={abierto}
        aria-haspopup="true"
      >
        🔍 Filtros
      </button>
      {abierto && (
        <div className="selector-filtros-dropdown" role="dialog" aria-label={titulo}>
          <div className="selector-filtros-header">
            <span>{titulo}</span>
            <button
              type="button"
              className="selector-filtros-restaurar"
              onClick={() => {
                onRestaurar();
                setAbierto(false);
              }}
            >
              Ver todos
            </button>
          </div>
          <ul className="selector-filtros-lista">
            {filtros.map((f) => (
              <li key={f.id}>
                <label className="selector-filtros-label">
                  <input
                    type="checkbox"
                    checked={visibleIds.includes(f.id)}
                    onChange={() => onToggle(f.id)}
                  />
                  <span>{f.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
