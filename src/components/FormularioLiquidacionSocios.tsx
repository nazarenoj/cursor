import { useState, useMemo, useEffect } from 'react';
import { useSociosCompletos } from '../hooks/useSociosCompletos';
import { useCategorias } from '../hooks/useCategorias';
import type { LiquidacionCuota, LiquidacionMensual } from '../types';
import './FormularioLiquidacionSocios.css';

export type CuotaAGenerar = { socioId: number; mes: string };

interface FormularioLiquidacionSociosProps {
  liquidacionesCuotas: LiquidacionCuota[];
  liquidacionesMensuales: LiquidacionMensual[];
  onGenerar: (pares: CuotaAGenerar[]) => void | Promise<void>;
  onCancel: () => void;
}

const clave = (socioId: number, mes: string) => `${socioId}-${mes}`;

/** Parsea una clave "socioId-mes" donde mes es YYYY-MM (tiene un guión). */
const parseClave = (key: string): { socioId: number; mes: string } => {
  const idx = key.indexOf('-');
  if (idx === -1) return { socioId: 0, mes: '' };
  return {
    socioId: Number(key.slice(0, idx)),
    mes: key.slice(idx + 1),
  };
};

export const FormularioLiquidacionSocios = ({
  liquidacionesCuotas,
  liquidacionesMensuales,
  onGenerar,
  onCancel,
}: FormularioLiquidacionSociosProps) => {
  const { data: socios = [], isLoading: loading } = useSociosCompletos();
  const { categorias } = useCategorias();
  const [sociosSeleccionados, setSociosSeleccionados] = useState<Set<number>>(new Set());
  const [busqueda, setBusqueda] = useState('');
  const [mostrarSoloActivos, setMostrarSoloActivos] = useState(true);
  /** Cuotas (socioId, mes) que el usuario quiere generar. Se puede agregar/quitar antes de generar. */
  const [cuotasParaGenerar, setCuotasParaGenerar] = useState<Set<string>>(new Set());
  /** Mes a agregar con el selector "Agregar mes" */
  const [mesAAgregar, setMesAAgregar] = useState('');

  // Meses restantes del año actual
  const mesesRestantes = useMemo(() => {
    const ahora = new Date();
    const añoActual = ahora.getFullYear();
    const mesActual = ahora.getMonth() + 1;
    const meses: string[] = [];
    for (let mes = mesActual; mes <= 12; mes++) {
      meses.push(`${añoActual}-${String(mes).padStart(2, '0')}`);
    }
    return meses;
  }, []);

  // Conjunto de (socioId, mes) que ya tienen cuota
  const cuotasExistentes = useMemo(() => {
    const set = new Set<string>();
    liquidacionesCuotas.forEach((c) => {
      const lm = liquidacionesMensuales.find((l) => l.id === c.liquidacionMensualId);
      if (lm) set.add(clave(c.socioId, lm.mes));
    });
    return set;
  }, [liquidacionesCuotas, liquidacionesMensuales]);

  // Socios filtrados por búsqueda y estado
  const sociosFiltrados = useMemo(() => {
    let filtrados = socios;
    if (mostrarSoloActivos) filtrados = filtrados.filter((s) => !s.fechaBaja);
    if (busqueda.trim()) {
      const b = busqueda.toLowerCase();
      filtrados = filtrados.filter(
        (s) =>
          s.numeroSocio.toString().includes(b) ||
          s.apellido.toLowerCase().includes(b) ||
          s.nombre.toLowerCase().includes(b) ||
          (s.dni ?? '').includes(b),
      );
    }
    return filtrados;
  }, [socios, busqueda, mostrarSoloActivos]);

  // Por defecto: todas las cuotas no liquidadas del resto del año para los socios seleccionados
  const cuotasNoLiquidadasDefault = useMemo(() => {
    const set = new Set<string>();
    sociosSeleccionados.forEach((socioId) => {
      mesesRestantes.forEach((mes) => {
        if (!cuotasExistentes.has(clave(socioId, mes))) set.add(clave(socioId, mes));
      });
    });
    return set;
  }, [sociosSeleccionados, mesesRestantes, cuotasExistentes]);

  // Cuando cambian los socios seleccionados, reiniciar "cuotas a generar" con las no liquidadas del resto del año
  const sociosKey = useMemo(() => Array.from(sociosSeleccionados).sort((a, b) => a - b).join(','), [sociosSeleccionados]);
  useEffect(() => {
    setCuotasParaGenerar(new Set(cuotasNoLiquidadasDefault));
  }, [sociosKey]); // eslint-disable-line react-hooks/exhaustive-deps -- solo reset al cambiar socios

  const toggleSocio = (socioId: number) => {
    setSociosSeleccionados((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(socioId)) nuevo.delete(socioId);
      else nuevo.add(socioId);
      return nuevo;
    });
  };

  const seleccionarTodos = () => setSociosSeleccionados(new Set(sociosFiltrados.map((s) => s.id)));
  const deseleccionarTodos = () => setSociosSeleccionados(new Set());

  const toggleCuota = (socioId: number, mes: string) => {
    const key = clave(socioId, mes);
    setCuotasParaGenerar((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const agregarMesParaTodos = () => {
    if (!mesAAgregar.trim()) return;
    const mes = mesAAgregar.trim();
    if (!/^\d{4}-\d{2}$/.test(mes)) return;
    setCuotasParaGenerar((prev) => {
      const next = new Set(prev);
      sociosSeleccionados.forEach((socioId) => {
        // Solo agregar si ese socio aún no tiene liquidación para ese mes (evitar duplicados)
        if (!cuotasExistentes.has(clave(socioId, mes))) {
          next.add(clave(socioId, mes));
        }
      });
      return next;
    });
    setMesAAgregar('');
  };

  const getNombreMes = (mesString: string) => {
    if (!mesString || !/^\d{4}-\d{2}$/.test(mesString)) return mesString || '-';
    const [año, mes] = mesString.split('-');
    const date = new Date(parseInt(año, 10), parseInt(mes, 10) - 1, 1);
    if (Number.isNaN(date.getTime())) return mesString;
    return date.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
  };

  const getNombreMesCorto = (mesString: string) => {
    if (!mesString || !/^\d{4}-\d{2}$/.test(mesString)) return mesString || '-';
    const [año, mes] = mesString.split('-');
    const date = new Date(parseInt(año, 10), parseInt(mes, 10) - 1, 1);
    if (Number.isNaN(date.getTime())) return mesString;
    return date.toLocaleString('es-AR', { month: 'short', year: '2-digit' });
  };

  // Meses que aparecen en la selección actual (para columnas de la tabla), ordenados
  const mesesEnTabla = useMemo(() => {
    const set = new Set<string>();
    cuotasParaGenerar.forEach((key) => {
      const { mes } = parseClave(key);
      if (mes) set.add(mes);
    });
    return Array.from(set).sort();
  }, [cuotasParaGenerar]);

  // Lista de items (socioId, mes) para mostrar: ordenada por mes y luego por socio
  const listaCuotasParaGenerar = useMemo(() => {
    const items: CuotaAGenerar[] = [];
    cuotasParaGenerar.forEach((key) => {
      const { socioId, mes } = parseClave(key);
      if (mes) items.push({ socioId, mes });
    });
    items.sort((a, b) => {
      if (a.mes !== b.mes) return a.mes.localeCompare(b.mes);
      return a.socioId - b.socioId;
    });
    return items;
  }, [cuotasParaGenerar]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sociosSeleccionados.size === 0) {
      alert('Debe seleccionar al menos un socio');
      return;
    }
    if (cuotasParaGenerar.size === 0) {
      alert('Debe tener al menos una cuota a generar. Agregue meses o seleccione socios con cuotas pendientes.');
      return;
    }
    await onGenerar(listaCuotasParaGenerar);
  };

  if (loading) {
    return <div className="formulario-liquidacion-socios">Cargando socios...</div>;
  }

  return (
    <div className="formulario-liquidacion-socios">
      <h2>Generar Liquidaciones para el Resto del Año</h2>
      <form onSubmit={handleSubmit}>
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
              sociosFiltrados.map((socio) => (
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
                      {categorias.find((c) => c.id === socio.categoriaId)?.nombre || 'Sin categoría'}
                    </span>
                    {socio.fechaBaja && <span className="socio-inactivo">(Inactivo)</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="form-section">
          <h3>Cuotas a generar</h3>
          <p className="info-text">
            Por defecto se muestran las cuotas no liquidadas del resto del año para los socios
            seleccionados. Podés agregar cualquier mes/año con el selector y quitar con clic en la tabla (no se duplican liquidaciones para el mismo socio y mes).
          </p>
          <div className="agregar-mes-row">
            <label htmlFor="mes-agregar">Agregar mes para los socios seleccionados (cualquier mes/año):</label>
            <input
              type="month"
              id="mes-agregar"
              value={mesAAgregar}
              onChange={(e) => setMesAAgregar(e.target.value)}
              className="input-mes-agregar"
              title="Elegí mes y año"
            />
            <button type="button" onClick={agregarMesParaTodos} className="btn-agregar-mes" disabled={!mesAAgregar || sociosSeleccionados.size === 0}>
              Agregar mes
            </button>
            <p className="info-text agregar-mes-ayuda">
              Solo se agregan cuotas para socios que aún no tengan liquidación en ese mes (no se duplican).
            </p>
          </div>
          <div className="cuotas-a-generar-wrapper">
            <p className="info-text tabla-cuotas-leyenda">
              Clic en un mes para sacarlo de los meses a incluir. Solo se generan las cuotas que aparecen como botón.
            </p>
            {cuotasParaGenerar.size === 0 ? (
              <p className="sin-resultados">
                No hay cuotas seleccionadas. Seleccioná socios para ver las cuotas no liquidadas del
                resto del año, o agregá un mes.
              </p>
            ) : (
              <div className="tabla-cuotas-scroll">
                <table className="tabla-cuotas-a-generar">
                  <thead>
                    <tr>
                      <th className="th-socio">Socio</th>
                      {mesesEnTabla.map((mes) => (
                        <th key={mes} className="th-mes">
                          {getNombreMesCorto(mes)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(sociosSeleccionados)
                      .sort((a, b) => {
                        const sa = socios.find((s) => s.id === a);
                        const sb = socios.find((s) => s.id === b);
                        return (sa?.numeroSocio ?? 0) - (sb?.numeroSocio ?? 0);
                      })
                      .filter((socioId) =>
                        mesesEnTabla.some((mes) => cuotasParaGenerar.has(clave(socioId, mes))),
                      )
                      .map((socioId) => {
                        const socio = socios.find((s) => s.id === socioId);
                        return (
                          <tr key={socioId}>
                            <td className="td-socio">
                              #{socio?.numeroSocio ?? socioId} {socio ? `${socio.apellido}, ${socio.nombre}` : ''}
                            </td>
                            {mesesEnTabla.map((mes) => {
                              const incluir = cuotasParaGenerar.has(clave(socioId, mes));
                              return (
                                <td key={mes} className="td-mes">
                                  {incluir ? (
                                    <button
                                      type="button"
                                      onClick={() => toggleCuota(socioId, mes)}
                                      className="btn-mes-incluido"
                                      title={`Quitar ${getNombreMes(mes)} de la generación`}
                                    >
                                      {getNombreMesCorto(mes)}
                                    </button>
                                  ) : (
                                    <span className="mes-vacio">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <p className="info-text resumen-cuotas">
            Total: <strong>{cuotasParaGenerar.size} cuota(s)</strong> a generar
          </p>
        </div>

        <div className="info-box">
          <h3>Información</h3>
          <ul>
            <li>Solo se generan liquidaciones para los socios seleccionados.</li>
            <li>Podés agregar cualquier mes y año; no se crean duplicados si el socio ya tiene liquidación en ese mes.</li>
            <li>Por defecto se listan las cuotas no liquidadas del resto del año; podés quitar o agregar antes de generar.</li>
            <li>El monto se calcula según la categoría de cada socio.</li>
          </ul>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn-cancel">
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-submit"
            disabled={sociosSeleccionados.size === 0 || cuotasParaGenerar.size === 0}
          >
            Generar {cuotasParaGenerar.size} cuota(s)
          </button>
        </div>
      </form>
    </div>
  );
};
