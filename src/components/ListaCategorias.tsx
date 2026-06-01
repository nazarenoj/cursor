import { useState, useMemo } from 'react';
import { useCategorias } from '../hooks/useCategorias';
import { useColumnPreferences } from '../hooks/useColumnPreferences';
import { FormularioCategoria } from './FormularioCategoria';
import { TablaCategorias } from './TablaCategorias';
import { ImprimirCategorias } from './ImprimirCategorias';
import { apiService } from '../services/api';
import type { Categoria } from '../types';
import './ListaCategorias.css';

const CATEGORIAS_COLUMN_IDS = ['id', 'nombre', 'costoCuota', 'acciones'] as const;

type FiltrosCategorias = { nombre: string; costoMin: string; costoMax: string };

export const ListaCategorias = () => {
  const {
    agregarCategoria,
    modificarCategoria,
    borrarCategoria,
    listarCategorias,
    loading,
    error,
  } = useCategorias();
  const { visibleColumns } = useColumnPreferences('categorias', [...CATEGORIAS_COLUMN_IDS]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | undefined>(undefined);
  const [mostrarImpresion, setMostrarImpresion] = useState(false);
  const [ordenColumna, setOrdenColumna] = useState<{ columna: string; direccion: 'asc' | 'desc' } | null>(null);
  const [filtros, setFiltros] = useState<FiltrosCategorias>({ nombre: '', costoMin: '', costoMax: '' });

  const categoriasListadas = listarCategorias();

  const categoriasFiltradas = useMemo(() => {
    return categoriasListadas.filter((c) => {
      if (filtros.nombre && !c.nombre.toLowerCase().includes(filtros.nombre.toLowerCase())) return false;
      if (filtros.costoMin && c.costoCuota < parseFloat(filtros.costoMin)) return false;
      if (filtros.costoMax && c.costoCuota > parseFloat(filtros.costoMax)) return false;
      return true;
    });
  }, [categoriasListadas, filtros]);

  const handleOrdenar = (columna: string) => {
    if (ordenColumna && ordenColumna.columna === columna) {
      setOrdenColumna({
        columna,
        direccion: ordenColumna.direccion === 'asc' ? 'desc' : 'asc',
      });
    } else {
      setOrdenColumna({ columna, direccion: 'asc' });
    }
  };

  const categoriasOrdenadas = [...categoriasFiltradas].sort((a, b) => {
    if (!ordenColumna) return 0;
    const { columna, direccion } = ordenColumna;
    let comparacion = 0;
    switch (columna) {
      case 'id':
        comparacion = a.id - b.id;
        break;
      case 'nombre':
        comparacion = a.nombre.localeCompare(b.nombre);
        break;
      case 'costoCuota':
        comparacion = a.costoCuota - b.costoCuota;
        break;
      default:
        return 0;
    }
    return direccion === 'asc' ? comparacion : -comparacion;
  });

  if (loading) {
    return (
      <div className="lista-categorias">
        <p>Cargando categorías...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lista-categorias">
        <p className="mensaje-error">{error}</p>
      </div>
    );
  }

  const handleAgregar = () => {
    setCategoriaEditando(undefined);
    setMostrarFormulario(true);
  };

  const handleModificar = (categoria: Categoria) => {
    setCategoriaEditando(categoria);
    setMostrarFormulario(true);
  };

  const handleBorrar = async (id: number) => {
    if (window.confirm('¿Está seguro que desea eliminar esta categoría?')) {
      try {
        await borrarCategoria(id);
      } catch (error) {
        const mensaje =
          error instanceof Error ? error.message : 'No se pudo eliminar la categoría.';
        alert(mensaje);
      }
    }
  };

  const handleSubmit = async (categoriaData: Omit<Categoria, 'id'>) => {
    try {
      if (categoriaEditando) {
        await modificarCategoria(categoriaEditando.id, categoriaData);
      } else {
        await agregarCategoria(categoriaData);
      }
      setMostrarFormulario(false);
      setCategoriaEditando(undefined);
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : 'No se pudo guardar la categoría.';
      alert(mensaje);
    }
  };

  const handleCancelar = () => {
    setMostrarFormulario(false);
    setCategoriaEditando(undefined);
  };

  const handleExportExcel = async () => {
    try {
      apiService.registrarExportacion('categorias', 'Excel', { total: categoriasFiltradas.length }).catch(console.warn);
      const visibleExport = visibleColumns.filter((id) => id !== 'acciones');
      const ids = visibleExport.length ? visibleExport : ['id', 'nombre', 'costoCuota'];
      const headers: Record<string, string> = { id: 'ID', nombre: 'Nombre', costoCuota: 'Costo Cuota' };
      const getValue: Record<string, (c: Categoria) => string | number> = {
        id: (c) => c.id,
        nombre: (c) => c.nombre,
        costoCuota: (c) => c.costoCuota,
      };
      const data = categoriasFiltradas.map((c) => {
        const row: Record<string, string | number> = {};
        ids.forEach((id) => {
          if (headers[id] && getValue[id]) row[headers[id]] = getValue[id](c);
        });
        return row;
      });
      if (Object.keys(data[0] || {}).length === 0) return;
      const { exportToExcel } = await import('../utils/exportExcel');
      exportToExcel(data, `Listado-Categorias-${Date.now()}`, 'Categorías');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo exportar a Excel.');
    }
  };

  if (mostrarImpresion) {
    return (
      <ImprimirCategorias
        categorias={categoriasFiltradas}
        onVolver={() => setMostrarImpresion(false)}
      />
    );
  }

  if (mostrarFormulario) {
    return (
      <div className="lista-categorias">
        <FormularioCategoria
          categoria={categoriaEditando}
          onSubmit={handleSubmit}
          onCancel={handleCancelar}
        />
      </div>
    );
  }

  return (
    <div className="lista-categorias">
      <div className="lista-header">
        <h1>Gestión de Categorías</h1>
        <div className="lista-actions">
          <button onClick={handleAgregar} className="btn-agregar">
            + Agregar Categoría
          </button>
              <button onClick={() => setMostrarImpresion(true)} className="btn-imprimir">
                📄 Exportar PDF
              </button>
              <button onClick={handleExportExcel} className="btn-imprimir btn-exportar-excel">
                📊 Exportar Excel
              </button>
        </div>
      </div>

      <div className="filtros-categorias">
        <div className="filtro-group">
          <label htmlFor="filtro-nombre-cat">Nombre:</label>
          <input
            type="text"
            id="filtro-nombre-cat"
            placeholder="Buscar por nombre"
            value={filtros.nombre}
            onChange={(e) => setFiltros((p) => ({ ...p, nombre: e.target.value }))}
          />
        </div>
        <div className="filtro-group">
          <label htmlFor="filtro-costo-min">Costo mín:</label>
          <input
            type="number"
            id="filtro-costo-min"
            placeholder="Costo mín"
            step="0.01"
            value={filtros.costoMin}
            onChange={(e) => setFiltros((p) => ({ ...p, costoMin: e.target.value }))}
          />
        </div>
        <div className="filtro-group">
          <label htmlFor="filtro-costo-max">Costo máx:</label>
          <input
            type="number"
            id="filtro-costo-max"
            placeholder="Costo máx"
            step="0.01"
            value={filtros.costoMax}
            onChange={(e) => setFiltros((p) => ({ ...p, costoMax: e.target.value }))}
          />
        </div>
        <div className="filtro-acciones">
          <button type="button" className="btn-limpiar" onClick={() => setFiltros({ nombre: '', costoMin: '', costoMax: '' })}>
            Limpiar filtros
          </button>
        </div>
      </div>

      <div className="lista-info">
        <p>Total de categorías: {categoriasFiltradas.length}</p>
      </div>

      <TablaCategorias
        categorias={categoriasOrdenadas}
        onModificar={handleModificar}
        onBorrar={handleBorrar}
        ordenColumna={ordenColumna}
        onOrdenar={handleOrdenar}
      />
    </div>
  );
};



