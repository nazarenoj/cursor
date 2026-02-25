import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type { Caja, MedioPagoDB } from '../types';
import './RegistrarEgreso.css';

interface RegistrarEgresoProps {
  onClose?: () => void;
  onSuccess?: () => void;
  asModal?: boolean;
}

export const RegistrarEgreso = ({ onClose, onSuccess, asModal = false }: RegistrarEgresoProps) => {
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [mediosPago, setMediosPago] = useState<MedioPagoDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    cajaId: '',
    tipo: 'egreso' as 'ingreso' | 'egreso',
    monto: 0,
    concepto: '',
    descripcion: '',
    medioPagoId: '',
    fecha: new Date().toISOString().split('T')[0],
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cajasData, mediosData] = await Promise.all([
        apiService.getCajas(),
        apiService.getMediosPago(),
      ]);
      setCajas(cajasData.filter((c) => c.activa));
      setMediosPago(mediosData.filter((m) => m.activo));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'monto' ? (value === '' ? 0 : parseFloat(value) || 0) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!formData.cajaId) {
      setError('Debe seleccionar una caja');
      return;
    }

    if (!formData.concepto.trim()) {
      setError('El concepto es obligatorio');
      return;
    }

    if (formData.monto <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    try {
      await apiService.registrarMovimientoCaja(Number(formData.cajaId), {
        tipo: formData.tipo,
        monto: formData.monto,
        concepto: formData.concepto.trim(),
        descripcion: formData.descripcion.trim() || undefined,
        medioPagoId: formData.medioPagoId ? Number(formData.medioPagoId) : undefined,
        fecha: formData.fecha,
      });

      setSuccess(true);
      setFormData({
        cajaId: '',
        tipo: 'egreso',
        monto: 0,
        concepto: '',
        descripcion: '',
        medioPagoId: '',
        fecha: new Date().toISOString().split('T')[0],
      });

      if (onSuccess) {
        onSuccess();
      }

      if (asModal && onClose) {
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1500);
      } else {
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar el movimiento');
    }
  };

  if (loading) {
    return <div className="registrar-egreso">Cargando...</div>;
  }

  return (
    <div className={`registrar-egreso ${asModal ? 'modal' : ''}`}>
      {asModal && <div className="modal-overlay" onClick={onClose}></div>}
      <div className={`card ${asModal ? 'modal-content' : ''}`}>
        <div className="card-header">
          <h1>Registrar Movimientos</h1>
          {asModal && onClose && (
            <button type="button" className="btn-cerrar" onClick={onClose} title="Cerrar">
              ✕
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="form-registrar-movimiento">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="cajaId">Caja *</label>
              <select
                id="cajaId"
                name="cajaId"
                value={formData.cajaId}
                onChange={handleChange}
                required
              >
                <option value="">Seleccionar caja</option>
                {cajas.map((caja) => (
                  <option key={caja.id} value={caja.id}>
                    {caja.nombre} (Saldo: ${caja.saldoActual.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="tipo">Tipo de Movimiento *</label>
              <select
                id="tipo"
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                required
              >
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </select>
            </div>

          <div className="form-group">
            <label htmlFor="monto">Monto *</label>
            <input
              type="number"
              id="monto"
              name="monto"
              value={formData.monto}
              onChange={handleChange}
              onFocus={(e) => e.target.select()}
              required
              step="0.01"
              min="0.01"
            />
          </div>

            <div className="form-group">
              <label htmlFor="fecha">Fecha *</label>
              <input
                type="date"
                id="fecha"
                name="fecha"
                value={formData.fecha}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="medioPagoId">Medio de Pago</label>
              <select
                id="medioPagoId"
                name="medioPagoId"
                value={formData.medioPagoId}
                onChange={handleChange}
              >
                <option value="">Sin medio de pago</option>
                {mediosPago.map((medio) => (
                  <option key={medio.id} value={medio.id}>
                    {medio.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group form-group-full">
              <label htmlFor="concepto">Concepto *</label>
              <input
                type="text"
                id="concepto"
                name="concepto"
                value={formData.concepto}
                onChange={handleChange}
                required
                placeholder="Ej: Pago de servicios, Compra de materiales, etc."
              />
            </div>

            <div className="form-group form-group-full">
              <label htmlFor="descripcion">Descripción</label>
              <textarea
                id="descripcion"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                rows={2}
                placeholder="Descripción adicional del movimiento"
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">Movimiento registrado correctamente</div>}

          <div className="form-actions">
            <button type="submit" className="btn-submit">
              Registrar Movimiento
            </button>
            {asModal && onClose && (
              <button type="button" className="btn-cancelar" onClick={onClose}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

