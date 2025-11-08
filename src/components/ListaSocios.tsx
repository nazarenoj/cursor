import { useState } from 'react';
import { useSocios } from '../hooks/useSocios';
import { useCategorias } from '../hooks/useCategorias';
import { FormularioSocio } from './FormularioSocio';
import { FiltrosSocios } from './FiltrosSocios';
import { TablaSocios } from './TablaSocios';
import { ImprimirSocios } from './ImprimirSocios';
import type { Socio, FiltrosSocio } from '../types';
import './ListaSocios.css';

export const ListaSocios = () => {
  const { socios, agregarSocio, modificarSocio, borrarSocio, listarSocios } = useSocios();
  const { categorias } = useCategorias();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [socioEditando, setSocioEditando] = useState<Socio | undefined>(undefined);
  const [filtros, setFiltros] = useState<FiltrosSocio>({});
  const [mostrarImpresion, setMostrarImpresion] = useState(false);

  const sociosFiltrados = listarSocios(filtros);

  const handleAgregar = () => {
    setSocioEditando(undefined);
    setMostrarFormulario(true);
  };

  const handleModificar = (socio: Socio) => {
    setSocioEditando(socio);
    setMostrarFormulario(true);
  };

  const handleBorrar = (id: number) => {
    if (window.confirm('¿Está seguro que desea eliminar este socio?')) {
      borrarSocio(id);
    }
  };

  const handleSubmit = (socioData: Omit<Socio, 'id'>) => {
    if (socioEditando) {
      modificarSocio(socioEditando.id, socioData);
    } else {
      agregarSocio(socioData);
    }
    setMostrarFormulario(false);
    setSocioEditando(undefined);
  };

  const handleCancelar = () => {
    setMostrarFormulario(false);
    setSocioEditando(undefined);
  };

  const handleImprimir = () => {
    setMostrarImpresion(true);
  };

  if (mostrarImpresion) {
    return (
      <ImprimirSocios
        socios={sociosFiltrados}
        categorias={categorias}
        filtros={filtros}
        onVolver={() => setMostrarImpresion(false)}
      />
    );
  }

  if (mostrarFormulario) {
    return (
      <div className="lista-socios">
        <FormularioSocio
          socio={socioEditando}
          onSubmit={handleSubmit}
          onCancel={handleCancelar}
        />
      </div>
    );
  }

  return (
    <div className="lista-socios">
      <div className="lista-header">
        <h1>Gestión de Socios</h1>
        <div className="lista-actions">
          <button onClick={handleAgregar} className="btn-agregar">
            + Agregar Socio
          </button>
          <button onClick={handleImprimir} className="btn-imprimir">
            🖨️ Imprimir
          </button>
        </div>
      </div>

      <FiltrosSocios
        filtros={filtros}
        categorias={categorias}
        onChange={setFiltros}
      />

      <div className="lista-info">
        <p>Total de socios: {sociosFiltrados.length}</p>
      </div>

      <TablaSocios
        socios={sociosFiltrados}
        categorias={categorias}
        onModificar={handleModificar}
        onBorrar={handleBorrar}
      />
    </div>
  );
};


