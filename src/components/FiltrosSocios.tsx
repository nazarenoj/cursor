import { useState } from 'react';
import type { FiltrosSocio, Categoria } from '../types';
import './FiltrosSocios.css';

interface FiltrosSociosProps {
  filtros: FiltrosSocio;
  categorias: Categoria[];
  onChange: (filtros: FiltrosSocio) => void;
}

export const FiltrosSocios = ({ filtros, categorias, onChange }: FiltrosSociosProps) => {
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtrosLocales, setFiltrosLocales] = useState<FiltrosSocio>(filtros);

  const handleChange = (name: keyof FiltrosSocio, value: string | number | boolean | undefined) => {
    const nuevosFiltros = { ...filtrosLocales, [name]: value || undefined };
    setFiltrosLocales(nuevosFiltros);
    onChange(nuevosFiltros);
  };

  const limpiarFiltros = () => {
    const filtrosVacios: FiltrosSocio = {};
    setFiltrosLocales(filtrosVacios);
    onChange(filtrosVacios);
  };

  const tieneFiltros = Object.values(filtros).some(v => v !== undefined && v !== '');

  return (
    <div className="filtros-socios">
      <div className="filtros-header">
        <button
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          className="btn-toggle-filtros"
        >
          {mostrarFiltros ? '▼' : '▶'} Filtros de Búsqueda
        </button>
        {tieneFiltros && (
          <button onClick={limpiarFiltros} className="btn-limpiar">
            Limpiar Filtros
          </button>
        )}
      </div>

      {mostrarFiltros && (
        <div className="filtros-content">
          <div className="filtros-grid">
            <div className="filtro-group">
              <label htmlFor="numeroSocio">Número de Socio</label>
              <input
                type="text"
                id="numeroSocio"
                value={filtrosLocales.numeroSocio || ''}
                onChange={(e) => handleChange('numeroSocio', e.target.value)}
                placeholder="Buscar por número..."
              />
            </div>

            <div className="filtro-group">
              <label htmlFor="apellido">Apellido</label>
              <input
                type="text"
                id="apellido"
                value={filtrosLocales.apellido || ''}
                onChange={(e) => handleChange('apellido', e.target.value)}
                placeholder="Buscar por apellido..."
              />
            </div>

            <div className="filtro-group">
              <label htmlFor="nombre">Nombre</label>
              <input
                type="text"
                id="nombre"
                value={filtrosLocales.nombre || ''}
                onChange={(e) => handleChange('nombre', e.target.value)}
                placeholder="Buscar por nombre..."
              />
            </div>

            <div className="filtro-group">
              <label htmlFor="dni">DNI</label>
              <input
                type="text"
                id="dni"
                value={filtrosLocales.dni || ''}
                onChange={(e) => handleChange('dni', e.target.value)}
                placeholder="Buscar por DNI..."
              />
            </div>

            <div className="filtro-group">
              <label htmlFor="categoriaId">Categoría</label>
              <select
                id="categoriaId"
                value={filtrosLocales.categoriaId || ''}
                onChange={(e) => handleChange('categoriaId', e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">Todas las categorías</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="filtro-group">
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

            <div className="filtro-group">
              <label htmlFor="provincia">Provincia</label>
              <input
                type="text"
                id="provincia"
                value={filtrosLocales.provincia || ''}
                onChange={(e) => handleChange('provincia', e.target.value)}
                placeholder="Buscar por provincia..."
              />
            </div>

            <div className="filtro-group">
              <label htmlFor="localidad">Localidad</label>
              <input
                type="text"
                id="localidad"
                value={filtrosLocales.localidad || ''}
                onChange={(e) => handleChange('localidad', e.target.value)}
                placeholder="Buscar por localidad..."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


