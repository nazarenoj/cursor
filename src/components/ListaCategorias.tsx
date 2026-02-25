import { useState } from 'react';
import { useCategorias } from '../hooks/useCategorias';
import { useColumnPreferences } from '../hooks/useColumnPreferences';
import { FormularioCategoria } from './FormularioCategoria';
import { TablaCategorias } from './TablaCategorias';
import { ImprimirCategorias } from './ImprimirCategorias';
import { exportToExcel } from '../utils/exportExcel';
import { apiService } from '../services/api';
import type { Categoria } from '../types';
import './ListaCategorias.css';

const CATEGORIAS_COLUMN_IDS = ['id', 'nombre', 'costoCuota', 'acciones'] as const;

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

  const categoriasListadas = listarCategorias();

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

  const categoriasOrdenadas = [...categoriasListadas].sort((a, b) => {
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

  const handleExportExcel = () => {
    try {
      apiService.registrarExportacion('categorias', 'Excel', { total: categoriasListadas.length }).catch(console.warn);
      const visibleExport = visibleColumns.filter((id) => id !== 'acciones');
      const ids = visibleExport.length ? visibleExport : ['id', 'nombre', 'costoCuota'];
      const headers: Record<string, string> = { id: 'ID', nombre: 'Nombre', costoCuota: 'Costo Cuota' };
      const getValue: Record<string, (c: Categoria) => string | number> = {
        id: (c) => c.id,
        nombre: (c) => c.nombre,
        costoCuota: (c) => c.costoCuota,
      };
      const data = categoriasListadas.map((c) => {
        const row: Record<string, string | number> = {};
        ids.forEach((id) => {
          if (headers[id] && getValue[id]) row[headers[id]] = getValue[id](c);
        });
        return row;
      });
      if (Object.keys(data[0] || {}).length === 0) return;
      exportToExcel(data, `Listado-Categorias-${Date.now()}`, 'Categorías');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo exportar a Excel.');
    }
  };

  if (mostrarImpresion) {
    return (
      <ImprimirCategorias
        categorias={categoriasListadas}
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

      <div className="lista-info">
        <p>Total de categorías: {categoriasListadas.length}</p>
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



