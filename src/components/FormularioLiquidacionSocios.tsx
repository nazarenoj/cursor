import { useState, useMemo } from 'react';
import { useSocios } from '../hooks/useSocios';
import { useCategorias } from '../hooks/useCategorias';
import './FormularioLiquidacionSocios.css';

interface FormularioLiquidacionSociosProps {
  onGenerar: (socioIds: number[], meses: string[]) => void;
  onCancel: () => void;
}

export const FormularioLiquidacionSocios = ({ onGenerar, onCancel }: FormularioLiquidacionSociosProps) => {
  const { socios, loading } = useSocios();
  const { categorias } = useCategorias();
  const [sociosSeleccionados, setSociosSeleccionados] = useState<Set<number>>(new Set());
  const [busqueda, setBusqueda] = useState('');
  const [mostrarSoloActivos, setMostrarSoloActivos] = useState(true);

  // Obtener meses restantes del año actual
  const mesesRestantes = useMemo(() => {
    const ahora = new Date();
    const añoActual = ahora.getFullYear();
    const mesActual = ahora.getMonth() + 1; // 1-12
    const meses: string[] = [];

    for (let mes = mesActual; mes <= 12; mes++) {
      const mesStr = String(mes).padStart(2, '0');
      meses.push(`${añoActual}-${mesStr}`);
    }

    return meses;
  }, []);

  // Filtrar socios según búsqueda y estado
  const sociosFiltrados = useMemo(() => {
    let filtrados = socios;

    if (mostrarSoloActivos) {
      filtrados = filtrados.filter(s => !s.fechaBaja);
    }

    if (busqueda.trim()) {
      const busquedaLower = busqueda.toLowerCase();
      filtrados = filtrados.filter(s =>
        s.numeroSocio.toString().includes(busquedaLower) ||
        s.apellido.toLowerCase().includes(busquedaLower) ||
        s.nombre.toLowerCase().includes(busquedaLower) ||
        (s.dni ?? '').includes(busquedaLower)
      );
    }

    return filtrados;
  }, [socios, busqueda, mostrarSoloActivos]);

  const toggleSocio = (socioId: number) => {
    setSociosSeleccionados(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(socioId)) {
        nuevo.delete(socioId);
      } else {
        nuevo.add(socioId);
      }
      return nuevo;
    });
  };

  const seleccionarTodos = () => {
    const todosIds = new Set(sociosFiltrados.map(s => s.id));
    setSociosSeleccionados(todosIds);
  };

  const deseleccionarTodos = () => {
    setSociosSeleccionados(new Set());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sociosSeleccionados.size === 0) {
      alert('Debe seleccionar al menos un socio');
      return;
    }
    onGenerar(Array.from(sociosSeleccionados), mesesRestantes);
  };

  const getNombreMes = (mesString: string) => {
    const [año, mes] = mesString.split('-');
    const fecha = new Date(parseInt(año), parseInt(mes) - 1, 1);
    return fecha.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return <div className="formulario-liquidacion-socios">Cargando socios...</div>;
  }

  return (
    <div className="formulario-liquidacion-socios">
      <h2>Generar Liquidaciones para el Resto del Año</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>Meses a Liquidar</h3>
          <div className="meses-lista">
            {mesesRestantes.map(mes => (
              <div key={mes} className="mes-item">
                {getNombreMes(mes)}
              </div>
            ))}
          </div>
          <p className="info-text">
            Se generarán liquidaciones para <strong>{mesesRestantes.length} mes(es)</strong> restante(s) del año {new Date().getFullYear()}
          </p>
        </div>

        <div className="form-section">
          <h3>Seleccionar Socios</h3>
          
          <div className="filtros-socios">
            <input
              type="text"
              placeholder="Buscar por número, apellido, nombre o DNI..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="input-busqueda"
            />
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={mostrarSoloActivos}
                onChange={(e) => setMostrarSoloActivos(e.target.checked)}
              />
              Solo activos
            </label>
          </div>

          <div className="acciones-seleccion">
            <button type="button" onClick={seleccionarTodos} className="btn-seleccionar">
              Seleccionar Todos ({sociosFiltrados.length})
            </button>
            <button type="button" onClick={deseleccionarTodos} className="btn-deseleccionar">
              Deseleccionar Todos
            </button>
            <span className="contador-seleccionados">
              {sociosSeleccionados.size} socio(s) seleccionado(s)
            </span>
          </div>

          <div className="lista-socios">
            {sociosFiltrados.length === 0 ? (
              <p className="sin-resultados">No se encontraron socios</p>
            ) : (
              sociosFiltrados.map(socio => (
                <div
                  key={socio.id}
                  className={`socio-item ${sociosSeleccionados.has(socio.id) ? 'seleccionado' : ''}`}
                  onClick={() => toggleSocio(socio.id)}
                >
                  <input
                    type="checkbox"
                    checked={sociosSeleccionados.has(socio.id)}
                    onChange={() => toggleSocio(socio.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="socio-info">
                    <span className="socio-numero">#{socio.numeroSocio}</span>
                    <span className="socio-nombre">
                      {socio.apellido}, {socio.nombre}
                    </span>
                    <span className="socio-categoria">
                      {categorias.find(c => c.id === socio.categoriaId)?.nombre || 'Sin categoría'}
                    </span>
                    {socio.fechaBaja && (
                      <span className="socio-inactivo">(Inactivo)</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="info-box">
          <h3>⚠️ Información Importante</h3>
          <ul>
            <li>Se generarán liquidaciones para los <strong>{mesesRestantes.length} meses</strong> restantes del año</li>
            <li>Se crearán cuotas para cada socio seleccionado</li>
            <li>Si ya existe una liquidación para un mes, se agregarán solo los socios que no tengan cuota en ese mes</li>
            <li>El monto se calculará según la categoría de cada socio</li>
            <li>Podrás marcar las liquidaciones como pagadas después de generarlas</li>
          </ul>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn-cancel">
            Cancelar
          </button>
          <button 
            type="submit" 
            className="btn-submit"
            disabled={sociosSeleccionados.size === 0}
          >
            Generar Liquidaciones ({sociosSeleccionados.size} socio(s) × {mesesRestantes.length} mes(es))
          </button>
        </div>
      </form>
    </div>
  );
};

