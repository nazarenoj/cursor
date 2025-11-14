import { useState, useEffect } from 'react';
import { useCategorias } from '../hooks/useCategorias';
import type { Socio } from '../types';
import './FormularioSocio.css';

interface FormularioSocioProps {
  socio?: Socio;
  numeroSocioSugerido: number;
  onSubmit: (socio: Omit<Socio, 'id'>) => void | Promise<void>;
  onCancel: () => void;
}

export const FormularioSocio = ({
  socio,
  numeroSocioSugerido,
  onSubmit,
  onCancel,
}: FormularioSocioProps) => {
  const { categorias } = useCategorias();
  const [formData, setFormData] = useState({
    numeroSocio: socio?.numeroSocio || numeroSocioSugerido,
    apellido: socio?.apellido || '',
    nombre: socio?.nombre || '',
    dni: socio?.dni || '',
    fechaNacimiento: socio?.fechaNacimiento || '',
    calle: socio?.calle || '',
    numeroCasa: socio?.numeroCasa || '',
    localidad: socio?.localidad || '',
    provincia: socio?.provincia || '',
    telefono: socio?.telefono || '',
    email: socio?.email || '',
    categoriaId: socio?.categoriaId || (categorias.length > 0 ? categorias[0].id : 0),
    obraSocial: socio?.obraSocial || '',
    numeroAfiliado: socio?.numeroAfiliado || '',
    fechaAlta: socio?.fechaAlta || new Date().toISOString().split('T')[0],
    fechaBaja: socio?.fechaBaja || null,
  });

  // Actualizar categoriaId cuando se carguen las categorías (solo para nuevos socios)
  useEffect(() => {
    if (!socio && categorias.length > 0 && formData.categoriaId === 0) {
      setFormData(prev => ({
        ...prev,
        categoriaId: categorias[0].id,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorias.length, socio]);

  // Actualizar número de socio sugerido cuando cambie (solo en alta)
  useEffect(() => {
    if (!socio) {
      setFormData(prev => ({
        ...prev,
        numeroSocio: numeroSocioSugerido,
      }));
    }
  }, [numeroSocioSugerido, socio]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      // Convertir a número los campos numéricos
      if (name === 'categoriaId' || name === 'numeroSocio') {
        return {
          ...prev,
          [name]: Number(value),
        };
      }
      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const formatTelefono = (value: string) => {
    // Formato para WhatsApp: +54 9 11 1234-5678
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 0) return '';
    if (cleaned.length <= 2) return `+${cleaned}`;
    if (cleaned.length <= 4) return `+${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
    if (cleaned.length <= 6) return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4)}`;
    if (cleaned.length <= 10) return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 10)}`;
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 10)}-${cleaned.slice(10, 14)}`;
  };

  const handleTelefonoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTelefono(e.target.value);
    setFormData(prev => ({ ...prev, telefono: formatted }));
  };

  return (
    <div className="formulario-socio">
      <h2>{socio ? 'Modificar Socio' : 'Agregar Nuevo Socio'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="numeroSocio">Número de Socio *</label>
            <input
              type="number"
              id="numeroSocio"
              name="numeroSocio"
              value={formData.numeroSocio}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="apellido">Apellido *</label>
            <input
              type="text"
              id="apellido"
              name="apellido"
              value={formData.apellido}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="nombre">Nombre *</label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="dni">DNI *</label>
            <input
              type="text"
              id="dni"
              name="dni"
              value={formData.dni}
              onChange={handleChange}
              required
              maxLength={8}
            />
          </div>

          <div className="form-group">
            <label htmlFor="fechaNacimiento">Fecha de Nacimiento *</label>
            <input
              type="date"
              id="fechaNacimiento"
              name="fechaNacimiento"
              value={formData.fechaNacimiento}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="calle">Calle *</label>
            <input
              type="text"
              id="calle"
              name="calle"
              value={formData.calle}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="numeroCasa">Número de Casa *</label>
            <input
              type="text"
              id="numeroCasa"
              name="numeroCasa"
              value={formData.numeroCasa}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="localidad">Localidad *</label>
            <input
              type="text"
              id="localidad"
              name="localidad"
              value={formData.localidad}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="provincia">Provincia *</label>
            <input
              type="text"
              id="provincia"
              name="provincia"
              value={formData.provincia}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="telefono">Teléfono (WhatsApp)</label>
            <input
              type="text"
              id="telefono"
              name="telefono"
              value={formData.telefono}
              onChange={handleTelefonoChange}
              placeholder="+54 9 11 1234-5678"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="categoriaId">Categoría de Socio *</label>
            <select
              id="categoriaId"
              name="categoriaId"
              value={formData.categoriaId}
              onChange={handleChange}
              required
            >
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="obraSocial">Obra Social</label>
            <input
              type="text"
              id="obraSocial"
              name="obraSocial"
              value={formData.obraSocial}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="numeroAfiliado">Número de Afiliado</label>
            <input
              type="text"
              id="numeroAfiliado"
              name="numeroAfiliado"
              value={formData.numeroAfiliado}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="fechaAlta">Fecha de Alta *</label>
            <input
              type="date"
              id="fechaAlta"
              name="fechaAlta"
              value={formData.fechaAlta}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="fechaBaja">Fecha de Baja</label>
            <input
              type="date"
              id="fechaBaja"
              name="fechaBaja"
              value={formData.fechaBaja || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, fechaBaja: e.target.value || null }))}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn-cancel">
            Cancelar
          </button>
          <button type="submit" className="btn-submit">
            {socio ? 'Modificar' : 'Agregar'}
          </button>
        </div>
      </form>
    </div>
  );
};


