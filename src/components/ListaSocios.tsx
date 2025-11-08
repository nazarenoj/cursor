import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocios } from '../hooks/useSocios';
import { useCategorias } from '../hooks/useCategorias';
import { FormularioSocio } from './FormularioSocio';
import { FiltrosSocios } from './FiltrosSocios';
import { TablaSocios } from './TablaSocios';
import { ImprimirSocios } from './ImprimirSocios';
import { LiquidacionesSocio } from './LiquidacionesSocio';
import { exportarSociosPdf } from '../utils/exportSociosPdf';
import type { Socio, FiltrosSocio } from '../types';
import './ListaSocios.css';

export const ListaSocios = () => {
  const {
    socios,
    agregarSocio,
    modificarSocio,
    borrarSocio,
    listarSocios,
    obtenerProximoNumeroSocio,
  } = useSocios();
  const { categorias } = useCategorias();
  const navigate = useNavigate();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [socioEditando, setSocioEditando] = useState<Socio | undefined>(undefined);
  const [filtros, setFiltros] = useState<FiltrosSocio>({});
  const [mostrarImpresion, setMostrarImpresion] = useState(false);
  const [socioLiquidaciones, setSocioLiquidaciones] = useState<Socio | undefined>(undefined);

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
    try {
      if (socioEditando) {
        modificarSocio(socioEditando.id, socioData);
      } else {
        agregarSocio(socioData);
      }
      setMostrarFormulario(false);
      setSocioEditando(undefined);
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : 'Ocurrió un error al guardar el socio.';
      alert(mensaje);
    }
  };

  const handleCancelar = () => {
    setMostrarFormulario(false);
    setSocioEditando(undefined);
  };

  const handleImprimir = () => {
    setMostrarImpresion(true);
  };

  const handleVerLiquidaciones = (socio: Socio) => {
    setSocioLiquidaciones(socio);
  };

  const handleVolverLiquidaciones = () => {
    setSocioLiquidaciones(undefined);
  };

  const handleRegistrarPago = (socio: Socio) => {
    navigate(`/pagos?socioId=${socio.id}`);
  };

  const handleExportPdf = () => {
    try {
      exportarSociosPdf(sociosFiltrados, categorias);
    } catch (error) {
      console.error(error);
      alert('No se pudo generar el PDF. Intentá nuevamente.');
    }
  };

  if (socioLiquidaciones) {
    return (
      <div className="lista-socios">
        <LiquidacionesSocio
          socio={socioLiquidaciones}
          onVolver={handleVolverLiquidaciones}
        />
      </div>
    );
  }

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
          numeroSocioSugerido={
            socioEditando ? socioEditando.numeroSocio : obtenerProximoNumeroSocio()
          }
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
        onVerLiquidaciones={handleVerLiquidaciones}
        onRegistrarPago={handleRegistrarPago}
        onExportPdf={handleExportPdf}
      />
    </div>
  );
};


