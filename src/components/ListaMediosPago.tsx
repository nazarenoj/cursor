import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type { MedioPagoDB, Caja } from '../types';
import './ListaMediosPago.css';

export const ListaMediosPago = () => {
  const [mediosPago, setMediosPago] = useState<MedioPagoDB[]>([]);
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [medioEditando, setMedioEditando] = useState<MedioPagoDB | undefined>(undefined);
  const [error, setError] = useState('');
  const [ordenColumna, setOrdenColumna] = useState<{ columna: string; direccion: 'asc' | 'desc' } | null>(null);

  const handleOrdenar = (columna: string) => {
    if (ordenColumna && ordenColumna.columna === columna) {
      setOrdenColumna({ columna, direccion: ordenColumna.direccion === 'asc' ? 'desc' : 'asc' });
    } else {
      setOrdenColumna({ columna, direccion: 'asc' });
    }
  };

  const mediosOrdenados = [...mediosPago].sort((a, b) => {
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
      case 'caja':
        const cajasA = a.cajas?.map((c) => c.nombre).join(', ') || '';
        const cajasB = b.cajas?.map((c) => c.nombre).join(', ') || '';
        comparacion = cajasA.localeCompare(cajasB);
        break;
      case 'tipoMovimiento':
        comparacion = (a.tipoMovimiento || '').localeCompare(b.tipoMovimiento || '');
        break;
      case 'estado':
        comparacion = (a.activo ? 1 : 0) - (b.activo ? 1 : 0);
        break;
      default:
        return 0;
    }
    return direccion === 'asc' ? comparacion : -comparacion;
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mediosData, cajasData] = await Promise.all([
        apiService.getMediosPago(),
        apiService.getCajas(),
      ]);
      setMediosPago(mediosData);
      setCajas(cajasData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleAgregar = () => {
    setMedioEditando(undefined);
    setMostrarFormulario(true);
    setError('');
  };

  const handleModificar = (medio: MedioPagoDB) => {
    setMedioEditando(medio);
    setMostrarFormulario(true);
    setError('');
  };

  const handleBorrar = async (id: number) => {
    if (!window.confirm('¿Está seguro que desea eliminar este medio de pago?')) {
      return;
    }

    try {
      await apiService.eliminarMedioPago(id);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar medio de pago');
    }
  };

  const handleSubmit = async (medioData: Omit<MedioPagoDB, 'id' | 'cajaNombre' | 'cajas'>) => {
    try {
      const dataToSend = {
        ...medioData,
        descripcion: medioData.descripcion || undefined,
        cajaId: medioData.cajaId ?? undefined,
        cajasIds: medioData.cajasIds || [],
      };
      if (medioEditando) {
        await apiService.actualizarMedioPago(medioEditando.id, dataToSend);
      } else {
        await apiService.crearMedioPago(dataToSend);
      }
      setMostrarFormulario(false);
      setMedioEditando(undefined);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar medio de pago');
    }
  };

  const handleCancelar = () => {
    setMostrarFormulario(false);
    setMedioEditando(undefined);
    setError('');
  };

  if (loading) {
    return <div className="lista-medios-pago">Cargando medios de pago...</div>;
  }

  if (mostrarFormulario) {
    return (
      <FormularioMedioPago
        medio={medioEditando}
        cajas={cajas}
        onSubmit={handleSubmit}
        onCancel={handleCancelar}
        error={error}
      />
    );
  }

  return (
    <div className="lista-medios-pago">
      <div className="lista-header">
        <h1>Gestión de Medios de Pago</h1>
        <div className="lista-actions">
          <button onClick={handleAgregar} className="btn-agregar">
            + Agregar Medio de Pago
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="lista-info">
        <p>Total de medios de pago: {mediosPago.length}</p>
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-medios-pago">
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
                onClick={() => handleOrdenar('caja')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Caja Asociada
                {ordenColumna?.columna === 'caja' && (
                  <span className="sort-indicator">{ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}</span>
                )}
              </th>
              <th
                className="sortable"
                onClick={() => handleOrdenar('tipoMovimiento')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Tipo Movimiento
                {ordenColumna?.columna === 'tipoMovimiento' && (
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
            {mediosPago.length === 0 ? (
              <tr>
                <td colSpan={7} className="sin-datos">
                  No hay medios de pago registrados.
                </td>
              </tr>
            ) : (
              mediosOrdenados.map((medio) => (
                <tr key={medio.id}>
                  <td>{medio.id}</td>
                  <td>{medio.nombre}</td>
                  <td>{medio.descripcion || '-'}</td>
                  <td>
                    {medio.cajas && medio.cajas.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {medio.cajas.map((caja) => (
                          <span key={caja.id} className="badge badge-caja" style={{ marginRight: '4px' }}>
                            {caja.nombre}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: '#999' }}>Sin cajas asociadas</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-tipo-movimiento badge-${medio.tipoMovimiento}`}>
                      {medio.tipoMovimiento === 'ingreso' ? 'Ingreso' : 
                       medio.tipoMovimiento === 'egreso' ? 'Egreso' : 'Ambos'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${medio.activo ? 'badge-activo' : 'badge-inactivo'}`}>
                      {medio.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="acciones">
                      <button
                        onClick={() => handleModificar(medio)}
                        className="btn-accion btn-modificar"
                        title="Modificar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleBorrar(medio.id)}
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
  );
};

interface FormularioMedioPagoProps {
  medio?: MedioPagoDB;
  cajas: Caja[];
  onSubmit: (data: Omit<MedioPagoDB, 'id' | 'cajaNombre' | 'cajas'>) => void;
  onCancel: () => void;
  error: string;
}

const FormularioMedioPago = ({ medio, cajas, onSubmit, onCancel, error }: FormularioMedioPagoProps) => {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    cajaId: null as number | null,
    cajasIds: [] as number[],
    tipoMovimiento: 'ambos' as 'ingreso' | 'egreso' | 'ambos',
    activo: true,
  });

  useEffect(() => {
    if (medio) {
      setFormData({
        nombre: medio.nombre,
        descripcion: medio.descripcion || '',
        cajaId: medio.cajaId,
        cajasIds: medio.cajasIds || (medio.cajaId ? [medio.cajaId] : []),
        tipoMovimiento: medio.tipoMovimiento || 'ambos',
        activo: medio.activo,
      });
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        cajaId: null,
        cajasIds: [],
        tipoMovimiento: 'ambos',
        activo: true,
      });
    }
  }, [medio]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value === '' ? null : value,
    }));
  };

  const handleCajaToggle = (cajaId: number) => {
    setFormData((prev) => {
      const cajasIds = prev.cajasIds || [];
      const nuevaLista = cajasIds.includes(cajaId)
        ? cajasIds.filter(id => id !== cajaId)
        : [...cajasIds, cajaId];
      
      return {
        ...prev,
        cajasIds: nuevaLista,
        cajaId: nuevaLista.length > 0 ? nuevaLista[0] : null, // Compatibilidad
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      return;
    }
    onSubmit({
      ...formData,
      cajaId: formData.cajaId === null ? null : Number(formData.cajaId),
      cajasIds: formData.cajasIds || [],
    });
  };

  return (
    <div className="formulario-medio-pago">
      <h2>{medio ? 'Modificar Medio de Pago' : 'Agregar Nuevo Medio de Pago'}</h2>
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
          <label>Cajas Asociadas</label>
          <div className="cajas-checkbox-container">
            {cajas.filter((c) => c.activa).length === 0 ? (
              <p className="sin-cajas">No hay cajas activas disponibles</p>
            ) : (
              cajas.filter((c) => c.activa).map((caja) => (
                <label key={caja.id} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={formData.cajasIds.includes(caja.id)}
                    onChange={() => handleCajaToggle(caja.id)}
                  />
                  <span>{caja.nombre}</span>
                </label>
              ))
            )}
          </div>
          <small className="form-help-text">
            Selecciona una o más cajas. Puedes dejar sin seleccionar si el medio de pago no está asociado a ninguna caja.
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="tipoMovimiento">Tipo de Movimiento *</label>
          <select
            id="tipoMovimiento"
            name="tipoMovimiento"
            value={formData.tipoMovimiento}
            onChange={handleChange}
            required
          >
            <option value="ambos">Ambos (Ingreso y Egreso)</option>
            <option value="ingreso">Solo Ingreso</option>
            <option value="egreso">Solo Egreso</option>
          </select>
        </div>

        <div className="form-group">
          <label className="checkbox-label-inline">
            <input
              type="checkbox"
              name="activo"
              checked={formData.activo}
              onChange={handleChange}
            />
            <span>Medio de pago activo</span>
          </label>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn-cancel">
            Cancelar
          </button>
          <button type="submit" className="btn-submit">
            {medio ? 'Modificar' : 'Agregar'}
          </button>
        </div>
      </form>
    </div>
  );
};

