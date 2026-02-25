import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type { Caja } from '../types';
import { ResumenCaja } from './ResumenCaja';
import { TransferirEntreCajas } from './TransferirEntreCajas';
import { RegistrarEgreso } from './RegistrarEgreso';
import { usePermissions } from '../contexts/PermissionsContext';
import './ListaCajas.css';

export const ListaCajas = () => {
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cajaEditando, setCajaEditando] = useState<Caja | undefined>(undefined);
  const [cajaResumen, setCajaResumen] = useState<Caja | undefined>(undefined);
  const [mostrarTransferencia, setMostrarTransferencia] = useState(false);
  const [mostrarRegistrarMovimiento, setMostrarRegistrarMovimiento] = useState(false);
  const [error, setError] = useState('');
  const [ordenColumna, setOrdenColumna] = useState<{ columna: string; direccion: 'asc' | 'desc' } | null>(null);
  const { tienePermiso } = usePermissions();

  const handleOrdenar = (columna: string) => {
    if (ordenColumna && ordenColumna.columna === columna) {
      setOrdenColumna({ columna, direccion: ordenColumna.direccion === 'asc' ? 'desc' : 'asc' });
    } else {
      setOrdenColumna({ columna, direccion: 'asc' });
    }
  };

  const cajasOrdenadas = [...cajas].sort((a, b) => {
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
      case 'descripcion':
        comparacion = (a.descripcion || '').localeCompare(b.descripcion || '');
        break;
      case 'saldoActual':
        comparacion = a.saldoActual - b.saldoActual;
        break;
      case 'estado':
        comparacion = (a.activa ? 1 : 0) - (b.activa ? 1 : 0);
        break;
      default:
        return 0;
    }
    return direccion === 'asc' ? comparacion : -comparacion;
  });

  useEffect(() => {
    loadCajas();
  }, []);

  const loadCajas = async () => {
    setLoading(true);
    try {
      const data = await apiService.getCajas();
      setCajas(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar cajas');
    } finally {
      setLoading(false);
    }
  };

  const handleAgregar = () => {
    setCajaEditando(undefined);
    setMostrarFormulario(true);
    setError('');
  };

  const handleModificar = (caja: Caja) => {
    setCajaEditando(caja);
    setMostrarFormulario(true);
    setError('');
  };

  const handleBorrar = async (id: number) => {
    const caja = cajas.find((c) => c.id === id);
    if (!caja) return;

    if (!window.confirm(`¿Está seguro que desea eliminar la caja "${caja.nombre}"?\n\nNota: No se puede eliminar una caja que tiene movimientos registrados.`)) {
      return;
    }

    try {
      await apiService.eliminarCaja(id);
      await loadCajas();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al eliminar caja';
      if (mensaje.includes('movimientos')) {
        alert(`No se puede eliminar la caja "${caja.nombre}" porque tiene movimientos registrados.\n\nPara eliminar esta caja, primero debe eliminar o transferir todos sus movimientos.`);
      } else {
        alert(mensaje);
      }
    }
  };

  const handleSubmit = async (cajaData: Omit<Caja, 'id' | 'saldoActual'>) => {
    try {
      const dataToSend = {
        ...cajaData,
        descripcion: cajaData.descripcion || undefined,
      };
      if (cajaEditando) {
        await apiService.actualizarCaja(cajaEditando.id, dataToSend);
      } else {
        await apiService.crearCaja(dataToSend);
      }
      setMostrarFormulario(false);
      setCajaEditando(undefined);
      await loadCajas();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar caja');
    }
  };

  const handleCancelar = () => {
    setMostrarFormulario(false);
    setCajaEditando(undefined);
    setError('');
  };

  const handleVerResumen = (caja: Caja) => {
    setCajaResumen(caja);
  };

  const handleCerrarResumen = () => {
    setCajaResumen(undefined);
  };

  const handleTransferir = () => {
    setMostrarTransferencia(true);
  };

  const handleCerrarTransferencia = () => {
    setMostrarTransferencia(false);
  };

  const handleTransferenciaExitosa = () => {
    loadCajas();
  };

  const handleRegistrarMovimiento = () => {
    setMostrarRegistrarMovimiento(true);
  };

  const handleCerrarRegistrarMovimiento = () => {
    setMostrarRegistrarMovimiento(false);
  };

  const handleMovimientoRegistrado = () => {
    loadCajas();
  };

  if (loading) {
    return <div className="lista-cajas">Cargando cajas...</div>;
  }

  if (mostrarFormulario) {
    return (
      <FormularioCaja
        caja={cajaEditando}
        onSubmit={handleSubmit}
        onCancel={handleCancelar}
        error={error}
      />
    );
  }

  return (
    <>
      <div className="lista-cajas">
        <div className="lista-header">
          <h1>Gestión Cajas/Cuentas</h1>
          <div className="lista-actions">
            {tienePermiso('cajas.movimientos') && (
              <button onClick={handleRegistrarMovimiento} className="btn-registrar-movimiento">
                📝 Registrar Movimientos
              </button>
            )}
            <button onClick={handleTransferir} className="btn-transferir">
              💸 Transferir entre Cajas
            </button>
            <button onClick={handleAgregar} className="btn-agregar">
              + Agregar Caja/Cuenta
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="lista-info">
          <p>Total de cajas: {cajas.length}</p>
        </div>

        <div className="tabla-wrapper">
          <table className="tabla-cajas">
            <thead>
              <tr>
                <th
                  className="sortable"
                  onClick={() => handleOrdenar('id')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  ID
                  {ordenColumna?.columna === 'id' && (
                    <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th
                  className="sortable"
                  onClick={() => handleOrdenar('nombre')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Nombre
                  {ordenColumna?.columna === 'nombre' && (
                    <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th
                  className="sortable"
                  onClick={() => handleOrdenar('descripcion')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Descripción
                  {ordenColumna?.columna === 'descripcion' && (
                    <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th
                  className="sortable"
                  onClick={() => handleOrdenar('saldoActual')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Saldo Actual
                  {ordenColumna?.columna === 'saldoActual' && (
                    <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th
                  className="sortable"
                  onClick={() => handleOrdenar('estado')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Estado
                  {ordenColumna?.columna === 'estado' && (
                    <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
            {cajas.length === 0 ? (
              <tr>
                <td colSpan={6} className="sin-datos">
                  No hay cajas registradas.
                </td>
              </tr>
            ) : (
              cajasOrdenadas.map((caja) => (
                <tr key={caja.id}>
                  <td>{caja.id}</td>
                  <td>{caja.nombre}</td>
                  <td>{caja.descripcion || '-'}</td>
                  <td className={caja.saldoActual >= 0 ? 'saldo-positivo' : 'saldo-negativo'}>
                    ${caja.saldoActual.toFixed(2)}
                  </td>
                    <td>
                      <span className={`badge ${caja.activa ? 'badge-activo' : 'badge-inactivo'}`}>
                        {caja.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td>
                      <div className="acciones">
                        <button
                          onClick={() => handleVerResumen(caja)}
                          className="btn-accion btn-resumen"
                          title="Ver Resumen"
                        >
                          📊
                        </button>
                        <button
                          onClick={() => handleModificar(caja)}
                          className="btn-accion btn-modificar"
                          title="Modificar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleBorrar(caja.id)}
                          className="btn-accion btn-borrar"
                          title="Borrar"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {cajaResumen && (
        <ResumenCaja caja={cajaResumen} onClose={handleCerrarResumen} />
      )}
      {mostrarTransferencia && (
        <TransferirEntreCajas
          cajas={cajas}
          onClose={handleCerrarTransferencia}
          onSuccess={handleTransferenciaExitosa}
        />
      )}
      {mostrarRegistrarMovimiento && (
        <RegistrarEgreso
          onClose={handleCerrarRegistrarMovimiento}
          onSuccess={handleMovimientoRegistrado}
          asModal={true}
        />
      )}
    </>
  );
};

interface FormularioCajaProps {
  caja?: Caja;
  onSubmit: (data: Omit<Caja, 'id' | 'saldoActual'>) => void;
  onCancel: () => void;
  error: string;
}

const FormularioCaja = ({ caja, onSubmit, onCancel, error }: FormularioCajaProps) => {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    saldoInicial: 0,
    activa: true,
  });
  const [tieneMovimientos, setTieneMovimientos] = useState(false);
  const [verificandoMovimientos, setVerificandoMovimientos] = useState(false);

  useEffect(() => {
    if (caja) {
      setFormData({
        nombre: caja.nombre,
        descripcion: caja.descripcion || '',
        saldoInicial: caja.saldoInicial,
        activa: caja.activa,
      });
      // Verificar si la caja tiene movimientos
      verificarMovimientos(caja.id);
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        saldoInicial: 0,
        activa: true,
      });
      setTieneMovimientos(false);
    }
  }, [caja]);

  const verificarMovimientos = async (cajaId: number) => {
    setVerificandoMovimientos(true);
    try {
      const movimientos = await apiService.getMovimientosCaja(cajaId, {});
      setTieneMovimientos(movimientos.length > 0);
    } catch (err) {
      // Si hay error, asumir que no tiene movimientos para no bloquear la edición
      setTieneMovimientos(false);
    } finally {
      setVerificandoMovimientos(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value === '' ? 0 : parseFloat(value) || 0,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="formulario-caja">
      <h2>{caja ? 'Modificar Caja/Cuenta' : 'Agregar Nueva Caja/Cuenta'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nombre">Nombre *</label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
            minLength={1}
          />
        </div>

        <div className="form-group">
          <label htmlFor="descripcion">Descripción</label>
          <textarea
            id="descripcion"
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            rows={3}
          />
        </div>

        <div className="form-group">
          <label htmlFor="saldoInicial">Saldo Inicial</label>
          {verificandoMovimientos ? (
            <div style={{ color: '#666', fontStyle: 'italic' }}>Verificando...</div>
          ) : (
            <>
              <input
                type="number"
                id="saldoInicial"
                name="saldoInicial"
                value={formData.saldoInicial}
                onChange={handleNumberChange}
                step="0.01"
                min="0"
                disabled={tieneMovimientos && !!caja}
                title={tieneMovimientos && caja ? 'No se puede modificar el saldo inicial cuando la caja ya tiene movimientos registrados' : ''}
              />
              {tieneMovimientos && caja && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#dc3545', fontStyle: 'italic' }}>
                  ⚠️ No se puede modificar el saldo inicial porque esta caja ya tiene movimientos registrados
                </div>
              )}
            </>
          )}
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              name="activa"
              checked={formData.activa}
              onChange={handleChange}
            />
            Caja activa
          </label>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn-cancel">
            Cancelar
          </button>
          <button type="submit" className="btn-submit">
            {caja ? 'Modificar' : 'Agregar'}
          </button>
        </div>
      </form>
    </div>
  );
};

