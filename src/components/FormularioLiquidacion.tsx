import { useState } from 'react';
import './FormularioLiquidacion.css';

interface FormularioLiquidacionProps {
  onGenerar: (mes: string) => void;
  onCancel: () => void;
  mesActual?: string;
  /** Si está definido, se generará la liquidación solo para este socio (filtro aplicado) */
  soloParaSocio?: string;
}

export const FormularioLiquidacion = ({ onGenerar, onCancel, mesActual, soloParaSocio }: FormularioLiquidacionProps) => {
  // Obtener el mes actual en formato YYYY-MM
  const getMesActual = () => {
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    return `${año}-${mes}`;
  };

  const [mes, setMes] = useState(mesActual || getMesActual());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerar(mes);
  };

  const getNombreMes = (mesString: string) => {
    const [año, mes] = mesString.split('-');
    const fecha = new Date(parseInt(año), parseInt(mes) - 1, 1);
    return fecha.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="formulario-liquidacion">
      <h2>Generar Liquidación Mensual</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="mes">Seleccionar Mes a Liquidar *</label>
          <input
            type="month"
            id="mes"
            name="mes"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            required
            min="2020-01"
            max="2099-12"
          />
          <p className="mes-seleccionado">
            Se generará la liquidación para: <strong>{getNombreMes(mes)}</strong>
          </p>
        </div>

        <div className="info-box">
          <h3>⚠️ Información Importante</h3>
          {soloParaSocio ? (
            <ul>
              <li>Se generará la liquidación <strong>solo para el socio:</strong> {soloParaSocio}</li>
              <li>El socio debe estar activo y no tener ya una liquidación pagada para este mes</li>
              <li>Si ya tiene una liquidación no pagada, se pedirá confirmación para reemplazarla</li>
            </ul>
          ) : (
            <ul>
              <li>Se generará una liquidación para cada socio <strong>activo</strong></li>
              <li>El monto se calculará según la categoría de cada socio</li>
              <li>Si ya existe liquidación para este mes, se agregarán solo los socios que no tenían</li>
              <li>Puedes marcar las liquidaciones como pagadas después de generarlas</li>
            </ul>
          )}
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn-cancel">
            Cancelar
          </button>
          <button type="submit" className="btn-submit">
            Generar Liquidación
          </button>
        </div>
      </form>
    </div>
  );
};


