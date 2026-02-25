import { useState, useEffect, useCallback } from 'react';
import { useCategorias } from '../hooks/useCategorias';
import type { Socio, Adherente, Localidad } from '../types';
import { apiService } from '../services/api';
import { PROVINCIAS_ARGENTINAS, obtenerCiudades } from '../utils/provinciasCiudades';
import './FormularioSocio.css';

const OPCION_AGREGAR_LOCALIDAD = '__agregar_nueva__';

interface FormularioSocioProps {
  socio?: Socio;
  numeroSocioSugerido: number;
  onSubmit: (socio: Omit<Socio, 'id'>, foto?: File | null) => void | Promise<void>;
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
    codigoPostal: socio?.codigoPostal ?? '',
    telefono: socio?.telefono || '',
    email: socio?.email || '',
    categoriaId: socio?.categoriaId || (categorias.length > 0 ? categorias[0].id : 0),
    obraSocial: socio?.obraSocial || '',
    numeroAfiliado: socio?.numeroAfiliado || '',
    fechaAlta: socio?.fechaAlta || new Date().toISOString().split('T')[0],
    fechaBaja: socio?.fechaBaja || null,
    adherentes: (socio?.adherentes || []) as Adherente[],
  });
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(socio?.foto || null);
  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState(socio?.provincia || '');
  const [localidadesApi, setLocalidadesApi] = useState<Localidad[]>([]);
  const [localidadOtra, setLocalidadOtra] = useState('');
  const [localidadEsOtra, setLocalidadEsOtra] = useState(false);
  const [mostrarFormNuevaLocalidad, setMostrarFormNuevaLocalidad] = useState(false);
  const [nuevaLocalidadNombre, setNuevaLocalidadNombre] = useState('');
  const [nuevaLocalidadCp, setNuevaLocalidadCp] = useState('');
  const [guardandoLocalidad, setGuardandoLocalidad] = useState(false);
  
  // Cargar localidades agregadas por usuarios cuando cambia la provincia
  const cargarLocalidadesApi = useCallback(async (provincia: string) => {
    if (!provincia || provincia === 'Otra') {
      setLocalidadesApi([]);
      return;
    }
    try {
      const list = await apiService.getLocalidades(provincia);
      setLocalidadesApi(list);
    } catch {
      setLocalidadesApi([]);
    }
  }, []);

  useEffect(() => {
    if (provinciaSeleccionada && provinciaSeleccionada !== 'Otra') {
      cargarLocalidadesApi(provinciaSeleccionada);
    } else {
      setLocalidadesApi([]);
    }
  }, [provinciaSeleccionada, cargarLocalidadesApi]);

  // Determinar si la localidad actual es "Otra" o está en la lista
  useEffect(() => {
    if (socio?.localidad && socio?.provincia) {
      const ciudades = obtenerCiudades(socio.provincia);
      const nombresCiudades = ciudades.map((c) => c.nombre);
      const enApi = () => localidadesApi.some((l) => l.nombre === socio.localidad);
      if (!nombresCiudades.includes(socio.localidad) && socio.localidad !== 'Otra' && !enApi()) {
        setLocalidadOtra(socio.localidad);
        setLocalidadEsOtra(true);
        setFormData(prev => ({ ...prev, localidad: 'Otra', codigoPostal: socio?.codigoPostal ?? '' }));
      } else if (socio.localidad === 'Otra') {
        setLocalidadEsOtra(true);
      } else {
        setLocalidadEsOtra(false);
        setLocalidadOtra('');
        // Buscar en ciudades estáticas primero
        const ciudadEstatica = ciudades.find((c) => c.nombre === socio.localidad);
        // Si no está en estáticas, buscar en API
        const locApi = !ciudadEstatica ? localidadesApi.find((l) => l.nombre === socio.localidad) : null;
        setFormData(prev => ({
          ...prev,
          localidad: socio.localidad ?? '',
          codigoPostal: ciudadEstatica?.codigoPostal ?? locApi?.codigoPostal ?? socio?.codigoPostal ?? '',
        }));
      }
      setProvinciaSeleccionada(socio.provincia);
    } else if (!socio) {
      setProvinciaSeleccionada('');
      setLocalidadOtra('');
      setLocalidadEsOtra(false);
    }
  }, [socio]);

  // Al cargar localidades de la API o al inicializar: rellenar CP si la localidad está en estáticas o API
  useEffect(() => {
    if (!socio?.localidad || !provinciaSeleccionada || provinciaSeleccionada === 'Otra') return;
    const ciudadesEstaticas = obtenerCiudades(provinciaSeleccionada);
    const ciudadEstatica = ciudadesEstaticas.find((c) => c.nombre === socio.localidad);
    const locApi = localidadesApi.find((l) => l.nombre === socio.localidad);
    
    if (ciudadEstatica || locApi) {
      setFormData((prev) => {
        if (prev.localidad !== socio.localidad) return prev;
        const cp = ciudadEstatica?.codigoPostal ?? locApi?.codigoPostal ?? prev.codigoPostal ?? '';
        return { ...prev, codigoPostal: cp };
      });
    }
  }, [localidadesApi, socio?.localidad, provinciaSeleccionada]);

  // Actualizar localidad cuando cambia la provincia (solo si no es la inicialización)
  useEffect(() => {
    if (provinciaSeleccionada && provinciaSeleccionada !== formData.provincia && !socio) {
      setFormData(prev => ({ ...prev, provincia: provinciaSeleccionada, localidad: '', codigoPostal: '' }));
      setLocalidadEsOtra(false);
      setLocalidadOtra('');
      setMostrarFormNuevaLocalidad(false);
    }
  }, [provinciaSeleccionada]);

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

  const handleProvinciaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provincia = e.target.value;
    setProvinciaSeleccionada(provincia);
    setFormData(prev => ({ ...prev, provincia, localidad: '' }));
    setLocalidadEsOtra(false);
    setLocalidadOtra('');
  };

  // Lista combinada: ciudades estáticas + localidades de la API (con código postal)
  const listaLocalidades = (() => {
    const estaticas = provinciaSeleccionada && provinciaSeleccionada !== 'Otra'
      ? obtenerCiudades(provinciaSeleccionada).map((ciudad) => ({ nombre: ciudad.nombre, codigoPostal: ciudad.codigoPostal }))
      : [];
    const deApi = localidadesApi.map((l) => ({ nombre: l.nombre, codigoPostal: l.codigoPostal }));
    const nombresEstaticas = new Set(estaticas.map((e) => e.nombre));
    const soloApi = deApi.filter((l) => !nombresEstaticas.has(l.nombre));
    return [...estaticas, ...soloApi];
  })();

  const handleLocalidadChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === OPCION_AGREGAR_LOCALIDAD) {
      setMostrarFormNuevaLocalidad(true);
      setLocalidadEsOtra(false);
      setFormData(prev => ({ ...prev, localidad: '', codigoPostal: '' }));
    } else if (value === 'Otra') {
      setLocalidadEsOtra(true);
      setMostrarFormNuevaLocalidad(false);
      setFormData(prev => ({ ...prev, localidad: 'Otra', codigoPostal: '' }));
    } else {
      setLocalidadEsOtra(false);
      setMostrarFormNuevaLocalidad(false);
      const item = listaLocalidades.find((l) => l.nombre === value);
      setFormData(prev => ({
        ...prev,
        localidad: value,
        codigoPostal: item?.codigoPostal ?? '',
      }));
    }
  };

  const handleLocalidadOtraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalidadOtra(value);
    setFormData(prev => ({ ...prev, localidad: value }));
  };

  const handleAgregarNuevaLocalidad = async () => {
    const nombre = nuevaLocalidadNombre.trim();
    if (!nombre || !provinciaSeleccionada || provinciaSeleccionada === 'Otra') return;
    setGuardandoLocalidad(true);
    try {
      const creada = await apiService.crearLocalidad({
        nombre,
        provincia: provinciaSeleccionada,
        codigoPostal: nuevaLocalidadCp.trim() || null,
      });
      setLocalidadesApi((prev) => [...prev, creada]);
      setFormData((prev) => ({
        ...prev,
        localidad: creada.nombre,
        codigoPostal: creada.codigoPostal ?? '',
      }));
      setMostrarFormNuevaLocalidad(false);
      setNuevaLocalidadNombre('');
      setNuevaLocalidadCp('');
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'No se pudo agregar la localidad.';
      
      // Si la localidad ya existe, intentar seleccionarla automáticamente
      if (mensaje === 'Localidad existente') {
        // Recargar localidades para asegurar que tenemos la lista actualizada
        await cargarLocalidadesApi(provinciaSeleccionada);
        
        // Buscar la localidad existente: primero en API, luego en estáticas
        const localidadesActualizadas = await apiService.getLocalidades(provinciaSeleccionada);
        const localidadEnApi = localidadesActualizadas.find(
          (l) => l.nombre.toLowerCase() === nombre.toLowerCase()
        );
        
        if (localidadEnApi) {
          // Está en la API
          setFormData((prev) => ({
            ...prev,
            localidad: localidadEnApi.nombre,
            codigoPostal: localidadEnApi.codigoPostal ?? '',
          }));
          setMostrarFormNuevaLocalidad(false);
          setNuevaLocalidadNombre('');
          setNuevaLocalidadCp('');
          alert('Localidad existente. Se seleccionó automáticamente.');
        } else {
          // Buscar en las ciudades estáticas
          const ciudadesEstaticas = obtenerCiudades(provinciaSeleccionada);
          const localidadEnEstaticas = ciudadesEstaticas.find(
            (c) => c.nombre.toLowerCase() === nombre.toLowerCase()
          );
          
          if (localidadEnEstaticas) {
            setFormData((prev) => ({
              ...prev,
              localidad: localidadEnEstaticas.nombre,
              codigoPostal: localidadEnEstaticas.codigoPostal ?? '',
            }));
            setMostrarFormNuevaLocalidad(false);
            setNuevaLocalidadNombre('');
            setNuevaLocalidadCp('');
            alert('Localidad existente. Se seleccionó automáticamente.');
          } else {
            alert(mensaje);
          }
        }
      } else {
        alert(mensaje);
      }
    } finally {
      setGuardandoLocalidad(false);
    }
  };

  // Auto-reemplazar en campos numéricos cuando reciben foco
  const handleNumberFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mostrarFormNuevaLocalidad) {
      alert('Completá "Agregar localidad" o cancelá para continuar.');
      return;
    }
    let localidadFinal = formData.localidad;
    if (localidadEsOtra) {
      localidadFinal = localidadOtra || 'Otra';
    }
    const { fechaBaja, ...dataSinFechaBaja } = formData;
    const dataToSubmit: Omit<Socio, 'id'> = {
      ...dataSinFechaBaja,
      provincia: provinciaSeleccionada || formData.provincia,
      localidad: localidadFinal,
      codigoPostal: formData.codigoPostal || null,
      fechaBaja: null,
    };
    await onSubmit(dataToSubmit, foto);
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEliminarFoto = () => {
    setFoto(null);
    setFotoPreview(null);
  };

  const handleAgregarAdherente = () => {
    setFormData(prev => ({
      ...prev,
      adherentes: [
        ...prev.adherentes,
        {
          apellido: '',
          nombre: '',
          dni: '',
          fechaNacimiento: '',
          parentesco: '',
        },
      ],
    }));
  };

  const handleEliminarAdherente = (index: number) => {
    setFormData(prev => ({
      ...prev,
      adherentes: prev.adherentes.filter((_, i) => i !== index),
    }));
  };

  const handleAdherenteChange = (index: number, field: keyof Adherente, value: string) => {
    setFormData(prev => ({
      ...prev,
      adherentes: prev.adherentes.map((adherente, i) =>
        i === index ? { ...adherente, [field]: value } : adherente
      ),
    }));
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
          {/* Sección: Datos Personales */}
          <div className="form-section">
            <div className="form-section-title">📋 Datos Personales</div>
            <div className="form-row form-row-4">
              <div className="form-group form-group-compact">
                <label htmlFor="numeroSocio">N° Socio *</label>
                <input
                  type="number"
                  id="numeroSocio"
                  name="numeroSocio"
                  value={formData.numeroSocio}
                  onChange={handleChange}
                  onFocus={handleNumberFocus}
                  required
                  className="input-compact"
                />
              </div>

              <div className="form-group form-group-compact">
                <label htmlFor="dni">DNI</label>
                <input
                  type="text"
                  id="dni"
                  name="dni"
                  value={formData.dni}
                  onChange={handleChange}
                  maxLength={15}
                  className="input-compact"
                />
              </div>

              <div className="form-group form-group-medium">
                <label htmlFor="apellido">Apellido *</label>
                <input
                  type="text"
                  id="apellido"
                  name="apellido"
                  value={formData.apellido}
                  onChange={handleChange}
                  required
                  className="input-medium"
                />
              </div>

              <div className="form-group form-group-medium">
                <label htmlFor="nombre">Nombre *</label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                  className="input-medium"
                />
              </div>
            </div>
            <div className="form-row form-row-2">
              <div className="form-group">
                <label htmlFor="fechaNacimiento">Fecha de Nacimiento</label>
                <input
                  type="date"
                  id="fechaNacimiento"
                  name="fechaNacimiento"
                  value={formData.fechaNacimiento}
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
            </div>
          </div>

          {/* Sección: Dirección */}
          <div className="form-section">
            <div className="form-section-title">📍 Dirección</div>
            <div className="form-row form-row-4">
              <div className="form-group form-group-medium">
                <label htmlFor="calle">Calle</label>
                <input
                  type="text"
                  id="calle"
                  name="calle"
                  value={formData.calle}
                  onChange={handleChange}
                  className="input-medium"
                />
              </div>

              <div className="form-group form-group-compact">
                <label htmlFor="numeroCasa">N° Casa</label>
                <input
                  type="text"
                  id="numeroCasa"
                  name="numeroCasa"
                  value={formData.numeroCasa}
                  onChange={handleChange}
                  className="input-compact"
                />
              </div>

              <div className="form-group form-group-medium">
                <label htmlFor="provincia">Provincia</label>
                <select
                  id="provincia"
                  name="provincia"
                  value={provinciaSeleccionada}
                  onChange={handleProvinciaChange}
                  className="input-medium"
                >
                  <option value="">Seleccionar provincia</option>
                  {PROVINCIAS_ARGENTINAS.map(prov => (
                    <option key={prov} value={prov}>{prov}</option>
                  ))}
                  <option value="Otra">Otra</option>
                </select>
              </div>

              <div className="form-group form-group-medium">
                <label htmlFor="localidad">Localidad</label>
                {provinciaSeleccionada && provinciaSeleccionada !== 'Otra' ? (
                  <>
                    <select
                      id="localidad"
                      name="localidad"
                      value={mostrarFormNuevaLocalidad ? OPCION_AGREGAR_LOCALIDAD : (localidadEsOtra ? 'Otra' : formData.localidad)}
                      onChange={handleLocalidadChange}
                      className="input-medium"
                    >
                      <option value="">Seleccionar localidad</option>
                      {listaLocalidades.map((item) => (
                        <option key={item.nombre} value={item.nombre}>
                          {item.nombre}{item.codigoPostal ? ` (CP: ${item.codigoPostal})` : ''}
                        </option>
                      ))}
                      <option value="Otra">Otra (especificar)</option>
                      <option value={OPCION_AGREGAR_LOCALIDAD}>+ Agregar nueva localidad</option>
                    </select>
                    {localidadEsOtra && (
                      <input
                        type="text"
                        placeholder="Especificar localidad"
                        value={localidadOtra}
                        onChange={handleLocalidadOtraChange}
                        className="localidad-otra-input"
                      />
                    )}
                    {mostrarFormNuevaLocalidad && (
                      <div className="form-nueva-localidad">
                        <input
                          type="text"
                          placeholder="Nombre de la localidad"
                          value={nuevaLocalidadNombre}
                          onChange={(e) => setNuevaLocalidadNombre(e.target.value)}
                          className="localidad-otra-input"
                        />
                        <input
                          type="text"
                          placeholder="Código postal"
                          value={nuevaLocalidadCp}
                          onChange={(e) => setNuevaLocalidadCp(e.target.value)}
                          className="input-cp"
                          maxLength={12}
                        />
                        <div className="form-nueva-localidad-buttons">
                          <button
                            type="button"
                            onClick={handleAgregarNuevaLocalidad}
                            disabled={!nuevaLocalidadNombre.trim() || guardandoLocalidad}
                            className="btn-agregar-localidad"
                          >
                            {guardandoLocalidad ? 'Guardando...' : 'Agregar localidad'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMostrarFormNuevaLocalidad(false);
                              setNuevaLocalidadNombre('');
                              setNuevaLocalidadCp('');
                            }}
                            className="btn-cancelar-localidad"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                    {formData.codigoPostal && !mostrarFormNuevaLocalidad && !localidadEsOtra && (
                      <small className="codigo-postal-label">Código postal: {formData.codigoPostal}</small>
                    )}
                  </>
                ) : provinciaSeleccionada === 'Otra' ? (
                  <input
                    type="text"
                    id="localidad"
                    name="localidad"
                    value={formData.localidad}
                    onChange={handleChange}
                    placeholder="Especificar localidad"
                    className="input-medium"
                  />
                ) : (
                  <input
                    type="text"
                    id="localidad"
                    name="localidad"
                    value={formData.localidad}
                    onChange={handleChange}
                    placeholder="Seleccione primero la provincia"
                    disabled
                    className="input-medium"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Sección: Contacto */}
          <div className="form-section">
            <div className="form-section-title">📞 Contacto</div>
            <div className="form-row form-row-2">
              <div className="form-group form-group-medium">
                <label htmlFor="telefono">Teléfono</label>
                <input
                  type="text"
                  id="telefono"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleTelefonoChange}
                  placeholder="+54 9 11 1234-5678"
                  className="input-medium"
                />
              </div>

              <div className="form-group form-group-large">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-large"
                />
              </div>
            </div>
          </div>

          {/* Sección: Obra Social */}
          <div className="form-section">
            <div className="form-section-title">🏥 Obra Social</div>
            <div className="form-row form-row-2">
              <div className="form-group form-group-medium">
                <label htmlFor="obraSocial">Obra Social</label>
                <input
                  type="text"
                  id="obraSocial"
                  name="obraSocial"
                  value={formData.obraSocial}
                  onChange={handleChange}
                  className="input-medium"
                />
              </div>

              <div className="form-group form-group-medium">
                <label htmlFor="numeroAfiliado">N° Afiliado</label>
                <input
                  type="text"
                  id="numeroAfiliado"
                  name="numeroAfiliado"
                  value={formData.numeroAfiliado}
                  onChange={handleChange}
                  className="input-medium"
                />
              </div>
            </div>
          </div>

          {/* Sección: Fechas */}
          <div className="form-section">
            <div className="form-section-title">📅 Fechas</div>
            <div className="form-row form-row-2">
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

              {/* Fecha de Baja no se puede modificar manualmente - solo mediante "Dar de Baja" o "Dar de Alta" */}
              {formData.fechaBaja && (
                <div className="form-group">
                  <label htmlFor="fechaBaja">Fecha de Baja (solo lectura)</label>
                  <input
                    type="date"
                    id="fechaBaja"
                    name="fechaBaja"
                    value={formData.fechaBaja || ''}
                    disabled
                    readOnly
                    style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                  />
                  <small style={{ color: '#666', fontSize: '0.85rem' }}>
                    La fecha de baja solo se puede modificar mediante "Dar de Baja" o "Dar de Alta" desde el listado
                  </small>
                </div>
              )}
            </div>
          </div>

          {/* Sección: Foto */}
          <div className="form-section">
            <div className="form-section-title">📸 Foto del Socio</div>
            <div className="form-row form-row-1">
              <div className="form-group form-group-full">
                <div className="foto-container">
                  {fotoPreview && (
                    <div className="foto-preview">
                      <img src={fotoPreview} alt="Preview" />
                      <button type="button" onClick={handleEliminarFoto} className="btn-eliminar-foto">
                        ✕ Eliminar
                      </button>
                    </div>
                  )}
                  <input
                    type="file"
                    id="foto"
                    name="foto"
                    accept="image/*"
                    onChange={handleFotoChange}
                    style={{ display: fotoPreview ? 'none' : 'block' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sección: Adherentes */}
          <div className="form-section seccion-adherentes">
          <div className="adherentes-header">
            <div className="form-section-title">👥 Adherentes</div>
            <button type="button" onClick={handleAgregarAdherente} className="btn-agregar-adherente">
              + Agregar Adherente
            </button>
          </div>
          {formData.adherentes.length > 0 && (
            <div className="adherentes-list">
              {formData.adherentes.map((adherente, index) => (
                <div key={index} className="adherente-card">
                  <div className="adherente-header-card">
                    <h4>Adherente {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => handleEliminarAdherente(index)}
                      className="btn-eliminar-adherente"
                    >
                      ✕ Eliminar
                    </button>
                  </div>
                  <div className="adherente-fields">
                    <div className="form-group form-group-medium">
                      <label>Apellido *</label>
                      <input
                        type="text"
                        value={adherente.apellido}
                        onChange={(e) => handleAdherenteChange(index, 'apellido', e.target.value)}
                        required
                        className="input-medium"
                      />
                    </div>
                    <div className="form-group form-group-medium">
                      <label>Nombre *</label>
                      <input
                        type="text"
                        value={adherente.nombre}
                        onChange={(e) => handleAdherenteChange(index, 'nombre', e.target.value)}
                        required
                        className="input-medium"
                      />
                    </div>
                    <div className="form-group form-group-compact">
                      <label>DNI</label>
                      <input
                        type="text"
                        value={adherente.dni ?? ''}
                        onChange={(e) => handleAdherenteChange(index, 'dni', e.target.value)}
                        maxLength={8}
                        className="input-compact"
                      />
                    </div>
                    <div className="form-group form-group-compact">
                      <label>Fecha Nac.</label>
                      <input
                        type="date"
                        value={adherente.fechaNacimiento ?? ''}
                        onChange={(e) => handleAdherenteChange(index, 'fechaNacimiento', e.target.value)}
                        className="input-compact"
                      />
                    </div>
                    <div className="form-group form-group-medium">
                      <label>Parentesco *</label>
                      <select
                        value={adherente.parentesco}
                        onChange={(e) => handleAdherenteChange(index, 'parentesco', e.target.value)}
                        required
                        className="input-medium"
                      >
                        <option value="">Seleccionar</option>
                        <option value="Cónyuge">Cónyuge</option>
                        <option value="Hijo/a">Hijo/a</option>
                        <option value="Padre">Padre</option>
                        <option value="Madre">Madre</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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


