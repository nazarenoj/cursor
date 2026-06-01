import { useState, useRef, useEffect } from 'react';
import type { FiltrosSocio, Categoria } from '../types';
import './FiltrosSocios.css';

export const SOCIOS_FILTROS = [
  { id: 'numeroSocio', label: 'N° Socio' },
  { id: 'apellido', label: 'Apellido' },
  { id: 'nombre', label: 'Nombre' },
  { id: 'dni', label: 'DNI' },
  { id: 'categoriaIds', label: 'Categoría(s)' },
  { id: 'activo', label: 'Estado' },
];
export const SOCIOS_FILTROS_DEFAULT = SOCIOS_FILTROS.map((f) => f.id);

interface SelectorCategoriasMultiProps {
  categorias: Categoria[];
  seleccionados: number[];
  onChange: (ids: number[]) => void;
}

const SelectorCategoriasMulti = ({ categorias, seleccionados, onChange }: SelectorCategoriasMultiProps) => {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleCategoria = (id: number) => {
    const nuevo = seleccionados.includes(id)
      ? seleccionados.filter((x) => x !== id)
      : [...seleccionados, id];
    onChange(nuevo.length > 0 ? nuevo : []);
  };

  const textoBoton =
    seleccionados.length === 0
      ? 'Todas'
      : seleccionados.length === 1
        ? categorias.find((c) => c.id === seleccionados[0])?.nombre ?? '1 categoría'
        : `${seleccionados.length} categorías`;

  return (
    <div className="filtro filtro-categorias-checkbox" ref={ref}>
      <label>Categoría(s)</label>
      <button
        type="button"
        className={`selector-categorias-trigger ${abierto ? 'abierto' : ''}`}
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        aria-haspopup="listbox"
      >
        {textoBoton}
        <span className="selector-categorias-chevron" aria-hidden>▼</span>
      </button>
      {abierto && (
        <div className="selector-categorias-panel" role="listbox">
          {categorias.map((cat) => (
            <label key={cat.id} className="selector-categorias-opcion">
              <input
                type="checkbox"
                checked={seleccionados.includes(cat.id)}
                onChange={() => toggleCategoria(cat.id)}
              />
              <span>{cat.nombre}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

interface FiltrosSociosProps {
  filtros: FiltrosSocio;
  categorias: Categoria[];
  onChange: (filtros: FiltrosSocio) => void;
  visibleFilters: string[];
  toggleFilter: (filterId: string) => void;
}

export const FiltrosSocios = ({ filtros, categorias, onChange, visibleFilters, toggleFilter: _toggleFilter }: FiltrosSociosProps) => {
  const [filtrosLocales, setFiltrosLocales] = useState<FiltrosSocio>(filtros);
  const lastPayloadRef = useRef<string>(JSON.stringify(filtros));
  const isFiltroVisible = (id: string) => visibleFilters.includes(id);

  useEffect(() => {
    setFiltrosLocales(filtros);
    lastPayloadRef.current = JSON.stringify(filtros);
  }, [filtros]);

  const emitirCambio = (nuevosFiltros: FiltrosSocio) => {
    const payload = JSON.stringify(nuevosFiltros);
    if (payload === lastPayloadRef.current) return;
    lastPayloadRef.current = payload;
    onChange(nuevosFiltros);
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      emitirCambio(filtrosLocales);
    }, 250);
    return () => clearTimeout(timeoutId);
  }, [
    filtrosLocales.numeroSocio,
    filtrosLocales.apellido,
    filtrosLocales.nombre,
    filtrosLocales.dni,
  ]);

  const handleChange = (name: keyof FiltrosSocio, value: string | number | boolean | undefined) => {
    // No usar value || undefined: activo=false (Inactivos) debe conservarse
    const normalized = (value === '' || value === undefined) ? undefined : value;
    const nuevosFiltros = { ...filtrosLocales, [name]: normalized };
    setFiltrosLocales(nuevosFiltros);
    const esFiltroTexto =
      name === 'numeroSocio' ||
      name === 'apellido' ||
      name === 'nombre' ||
      name === 'dni';
    if (!esFiltroTexto) {
      emitirCambio(nuevosFiltros);
    }
  };

  const limpiarFiltros = () => {
    const filtrosVacios: FiltrosSocio = {};
    setFiltrosLocales(filtrosVacios);
    emitirCambio(filtrosVacios);
  };

  return (
    <div className="filtros-socios">
        {isFiltroVisible('numeroSocio') && (
          <div className="filtro">
            <label htmlFor="numeroSocio">Número de Socio</label>
            <input
              type="text"
              id="numeroSocio"
              value={filtrosLocales.numeroSocio || ''}
              onChange={(e) => handleChange('numeroSocio', e.target.value)}
              placeholder="Buscar por número..."
            />
          </div>
        )}
        {isFiltroVisible('apellido') && (
          <div className="filtro">
            <label htmlFor="apellido">Apellido</label>
            <input
              type="text"
              id="apellido"
              value={filtrosLocales.apellido || ''}
              onChange={(e) => handleChange('apellido', e.target.value)}
              placeholder="Buscar por apellido..."
            />
          </div>
        )}
        {isFiltroVisible('nombre') && (
          <div className="filtro">
            <label htmlFor="nombre">Nombre</label>
            <input
              type="text"
              id="nombre"
              value={filtrosLocales.nombre || ''}
              onChange={(e) => handleChange('nombre', e.target.value)}
              placeholder="Buscar por nombre..."
            />
          </div>
        )}
        {isFiltroVisible('dni') && (
          <div className="filtro">
            <label htmlFor="dni">DNI</label>
            <input
              type="text"
              id="dni"
              value={filtrosLocales.dni || ''}
              onChange={(e) => handleChange('dni', e.target.value)}
              placeholder="Buscar por DNI..."
            />
          </div>
        )}
        {isFiltroVisible('categoriaIds') && (
          <SelectorCategoriasMulti
            categorias={categorias}
            seleccionados={filtrosLocales.categoriaIds ?? (filtrosLocales.categoriaId ? [filtrosLocales.categoriaId] : [])}
            onChange={(ids) => {
              const nuevos = {
                ...filtrosLocales,
                categoriaId: undefined,
                categoriaIds: ids.length > 0 ? ids : undefined,
              };
              setFiltrosLocales(nuevos);
              emitirCambio(nuevos);
            }}
          />
        )}
        {isFiltroVisible('activo') && (
          <div className="filtro">
            <label htmlFor="activo">Estado</label>
        <select
          id="activo"
          value={filtrosLocales.activo === undefined ? '' : filtrosLocales.activo ? 'activo' : 'inactivo'}
          onChange={(e) => handleChange('activo', e.target.value === '' ? undefined : e.target.value === 'activo')}
        >
          <option value="">Todos</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
          </div>
        )}
        <div className="acciones-filtros">
          <button type="button" onClick={limpiarFiltros} className="btn-limpiar">
            Limpiar filtros
          </button>
        </div>
      </div>
  );
};



