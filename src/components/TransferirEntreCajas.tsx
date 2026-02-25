import { useState } from 'react';
import { apiService } from '../services/api';
import type { Caja } from '../types';
import './TransferirEntreCajas.css';

interface TransferirEntreCajasProps {
  cajas: Caja[];
  onClose: () => void;
  onSuccess: () => void;
}

export const TransferirEntreCajas = ({ cajas, onClose, onSuccess }: TransferirEntreCajasProps) => {
  const [formData, setFormData] = useState({
    cajaOrigenId: '',
    cajaDestinoId: '',
    monto: 0,
    concepto: '',
    descripcion: '',
    fecha: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cajasActivas = cajas.filter((c) => c.activa);

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

    if (!formData.cajaOrigenId || !formData.cajaDestinoId) {
      setError('Debe seleccionar ambas cajas');
      return;
    }

    if (formData.cajaOrigenId === formData.cajaDestinoId) {
      setError('La caja origen y destino no pueden ser la misma');
      return;
    }

    if (formData.monto <= 0) {
      setError('El monto debe ser mayor a cero');
      return;
    }

    if (!formData.concepto.trim()) {
      setError('El concepto es obligatorio');
      return;
    }

    const cajaOrigen = cajas.find((c) => c.id === Number(formData.cajaOrigenId));
    if (cajaOrigen && cajaOrigen.saldoActual < formData.monto) {
      setError(`El saldo de la caja origen ($${cajaOrigen.saldoActual.toFixed(2)}) es insuficiente`);
      return;
    }

    setLoading(true);
    try {
      await apiService.transferirEntreCajas(
        Number(formData.cajaOrigenId),
        Number(formData.cajaDestinoId),
        {
          monto: formData.monto,
          concepto: formData.concepto.trim(),
          descripcion: formData.descripcion.trim() || undefined,
          fecha: formData.fecha,
        },
      );
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al realizar la transferencia');
    } finally {
      setLoading(false);
    }
  };

  const cajaOrigen = cajas.find((c) => c.id === Number(formData.cajaOrigenId));
  const cajaDestino = cajas.find((c) => c.id === Number(formData.cajaDestinoId));

  return (
    <div className="transferir-cajas-overlay" onClick={onClose}>
      <div className="transferir-cajas-modal" onClick={(e) => e.stopPropagation()}>
        <div className="transferir-cajas-header">
          <h2>Transferir entre Cajas/Cuentas</h2>
          <button className="btn-cerrar" onClick={onClose} title="Cerrar">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="cajaOrigenId">Caja Origen *</label>
              <select
                id="cajaOrigenId"
                name="cajaOrigenId"
                value={formData.cajaOrigenId}
                onChange={handleChange}
                required
              >
                <option value="">Seleccionar caja origen</option>
                {cajasActivas.map((caja) => (
                  <option key={caja.id} value={caja.id}>
                    {caja.nombre} (Saldo: ${caja.saldoActual.toFixed(2)})
                  </option>
                ))}
              </select>
              {cajaOrigen && (
                <div className="info-saldo">
                  Saldo disponible: ${cajaOrigen.saldoActual.toFixed(2)}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="cajaDestinoId">Caja Destino *</label>
              <select
                id="cajaDestinoId"
                name="cajaDestinoId"
                value={formData.cajaDestinoId}
                onChange={handleChange}
                required
              >
                <option value="">Seleccionar caja destino</option>
                {cajasActivas
                  .filter((c) => c.id !== Number(formData.cajaOrigenId))
                  .map((caja) => (
                    <option key={caja.id} value={caja.id}>
                      {caja.nombre} (Saldo: ${caja.saldoActual.toFixed(2)})
                    </option>
                  ))}
              </select>
              {cajaDestino && (
                <div className="info-saldo">
                  Saldo actual: ${cajaDestino.saldoActual.toFixed(2)}
                </div>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="monto">Monto *</label>
              <input
                type="number"
                id="monto"
                name="monto"
                value={formData.monto}
                onChange={handleChange}
                onFocus={(e) => e.target.select()}
                step="0.01"
                min="0.01"
                required
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
          </div>

          <div className="form-group">
            <label htmlFor="concepto">Concepto *</label>
            <input
              type="text"
              id="concepto"
              name="concepto"
              value={formData.concepto}
              onChange={handleChange}
              placeholder="Ej: Transferencia entre cajas"
              required
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
              placeholder="Descripción opcional de la transferencia"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-cancel" disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Transferiendo...' : 'Transferir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

