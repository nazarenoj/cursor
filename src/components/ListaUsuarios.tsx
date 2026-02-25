import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { useColumnPreferences } from '../hooks/useColumnPreferences';
import { SelectorColumnas } from './SelectorColumnas';
import type { Usuario, Permiso } from '../types';
import './ListaUsuarios.css';

const USUARIOS_COLUMNS = [
  { id: 'id', label: 'ID' },
  { id: 'usuario', label: 'Usuario' },
  { id: 'estado', label: 'Estado' },
  { id: 'acciones', label: 'Acciones' },
];
const USUARIOS_DEFAULT_VISIBLE = USUARIOS_COLUMNS.map((c) => c.id);

export const ListaUsuarios = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | undefined>(undefined);
  const [usuarioPermisos, setUsuarioPermisos] = useState<Usuario | undefined>(undefined);
  const [error, setError] = useState('');
  const [ordenColumna, setOrdenColumna] = useState<{ columna: string; direccion: 'asc' | 'desc' } | null>(null);

  const { visibleColumns, setVisibleColumns, toggleColumn, loading: loadingCols } = useColumnPreferences(
    'usuarios',
    USUARIOS_DEFAULT_VISIBLE,
  );
  const visible = loadingCols ? USUARIOS_DEFAULT_VISIBLE : visibleColumns;
  const isVisible = (id: string) => visible.includes(id);

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    setLoading(true);
    try {
      const data = await apiService.getUsuarios();
      setUsuarios(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleAgregar = () => {
    setUsuarioEditando(undefined);
    setMostrarFormulario(true);
    setError('');
  };

  const handleModificar = (usuario: Usuario) => {
    setUsuarioEditando(usuario);
    setMostrarFormulario(true);
    setError('');
  };

  const handleBorrar = async (id: number) => {
    const usuario = usuarios.find((u) => u.id === id);
    if (usuario && usuario.usuario === 'admin') {
      alert('No se puede eliminar el usuario administrador');
      return;
    }

    if (!window.confirm('¿Está seguro que desea eliminar este usuario?')) {
      return;
    }

    try {
      await apiService.eliminarUsuario(id);
      await loadUsuarios();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar usuario');
    }
  };

  const handleSubmit = async (formData: { usuario: string; password: string; activo: boolean }) => {
    try {
      if (usuarioEditando) {
        await apiService.actualizarUsuario(usuarioEditando.id, formData);
      } else {
        await apiService.crearUsuario(formData);
      }
      setMostrarFormulario(false);
      setUsuarioEditando(undefined);
      await loadUsuarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar usuario');
    }
  };

  const handleCancelar = () => {
    setMostrarFormulario(false);
    setUsuarioEditando(undefined);
    setError('');
  };

  const handleGestionarPermisos = (usuario: Usuario) => {
    setUsuarioPermisos(usuario);
  };

  const handleCerrarPermisos = () => {
    setUsuarioPermisos(undefined);
  };

  const handleOrdenar = (columna: string) => {
    if (ordenColumna && ordenColumna.columna === columna) {
      setOrdenColumna({
        columna,
        direccion: ordenColumna.direccion === 'asc' ? 'desc' : 'asc',
      });
    } else {
      setOrdenColumna({ columna, direccion: 'asc' });
    }
  };

  const usuariosOrdenados = [...usuarios].sort((a, b) => {
    if (!ordenColumna) return 0;
    const { columna, direccion } = ordenColumna;
    let comparacion = 0;
    switch (columna) {
      case 'id':
        comparacion = a.id - b.id;
        break;
      case 'usuario':
        comparacion = a.usuario.localeCompare(b.usuario);
        break;
      case 'estado':
        comparacion = (a.activo ? 1 : 0) - (b.activo ? 1 : 0);
        break;
      default:
        return 0;
    }
    return direccion === 'asc' ? comparacion : -comparacion;
  });

  if (loading) {
    return <div className="lista-usuarios">Cargando usuarios...</div>;
  }

  if (mostrarFormulario) {
    return (
      <FormularioUsuario
        usuario={usuarioEditando}
        onSubmit={handleSubmit}
        onCancel={handleCancelar}
        error={error}
      />
    );
  }

  return (
    <div className="lista-usuarios">
      <div className="lista-header">
        <h1>Gestión de Usuarios</h1>
        <div className="lista-actions">
          <button onClick={handleAgregar} className="btn-agregar">
            + Agregar Usuario
          </button>
        </div>
      </div>

      <div className="lista-info">
        <p>Total de usuarios: {usuarios.length}</p>
      </div>

      <div className="tabla-wrapper">
        <div className="tabla-acciones-superior">
          <SelectorColumnas
            columnas={USUARIOS_COLUMNS}
            visibleIds={visible}
            onToggle={toggleColumn}
            onRestaurar={() => setVisibleColumns(USUARIOS_DEFAULT_VISIBLE)}
            titulo="Columnas visibles"
          />
        </div>
        <table className="tabla-usuarios">
          <thead>
            <tr>
              {isVisible('id') && (
                <th
                  className="sortable"
                  onClick={() => handleOrdenar('id')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  ID
                  {ordenColumna?.columna === 'id' && (
                    <span className="sort-indicator">
                      {ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}
                    </span>
                  )}
                </th>
              )}
              {isVisible('usuario') && (
                <th
                  className="sortable"
                  onClick={() => handleOrdenar('usuario')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Usuario
                  {ordenColumna?.columna === 'usuario' && (
                    <span className="sort-indicator">
                      {ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}
                    </span>
                  )}
                </th>
              )}
              {isVisible('estado') && (
                <th
                  className="sortable"
                  onClick={() => handleOrdenar('estado')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Estado
                  {ordenColumna?.columna === 'estado' && (
                    <span className="sort-indicator">
                      {ordenColumna.direccion === 'asc' ? ' ↑' : ' ↓'}
                    </span>
                  )}
                </th>
              )}
              {isVisible('acciones') && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan={visible.length || 4} className="sin-datos">
                  No hay usuarios registrados.
                </td>
              </tr>
            ) : (
              usuariosOrdenados.map((usuario) => (
                <tr key={usuario.id}>
                  {isVisible('id') && <td>{usuario.id}</td>}
                  {isVisible('usuario') && <td>{usuario.usuario}</td>}
                  {isVisible('estado') && (
                    <td>
                      <span className={`badge ${usuario.activo ? 'badge-activo' : 'badge-inactivo'}`}>
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  )}
                  {isVisible('acciones') && (
                    <td>
                      <div className="acciones">
                        <button
                          onClick={() => handleModificar(usuario)}
                          className="btn-accion btn-modificar"
                          title="Modificar"
                        >
                          ✏️
                        </button>
                        {usuario.usuario !== 'admin' && (
                          <button
                            onClick={() => handleGestionarPermisos(usuario)}
                            className="btn-accion btn-permisos"
                            title="Gestionar permisos"
                          >
                            🔐
                          </button>
                        )}
                        {usuario.usuario !== 'admin' && (
                          <button
                            onClick={() => handleBorrar(usuario.id)}
                            className="btn-accion btn-borrar"
                            title="Borrar"
                          >
                            🗑️
                          </button>
                        )}
                        {usuario.usuario === 'admin' && (
                          <span className="admin-badge" title="Usuario administrador - No se puede modificar ni eliminar">
                            👑 Admin
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {usuarioPermisos && (
        <GestionarPermisos
          usuario={usuarioPermisos}
          onClose={handleCerrarPermisos}
          onUpdate={loadUsuarios}
        />
      )}
    </div>
  );
};

interface FormularioUsuarioProps {
  usuario?: Usuario;
  onSubmit: (data: { usuario: string; password: string; activo: boolean }) => void;
  onCancel: () => void;
  error: string;
}

const FormularioUsuario = ({ usuario, onSubmit, onCancel, error }: FormularioUsuarioProps) => {
  const [formData, setFormData] = useState({
    usuario: '',
    password: '',
    activo: true,
  });

  // Cargar datos del usuario solo cuando se está editando
  useEffect(() => {
    if (usuario) {
      setFormData({
        usuario: usuario.usuario,
        password: '',
        activo: usuario.activo,
      });
    } else {
      // Al crear nuevo usuario, campos vacíos
      setFormData({
        usuario: '',
        password: '',
        activo: true,
      });
    }
  }, [usuario]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.usuario || (!usuario && !formData.password)) {
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="formulario-usuario">
      <h2>{usuario ? 'Modificar Usuario' : 'Agregar Nuevo Usuario'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="usuario">Usuario *</label>
          <input
            type="text"
            id="usuario"
            name="usuario"
            value={formData.usuario}
            onChange={handleChange}
            required
            minLength={3}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">
            {usuario ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required={!usuario}
            minLength={4}
          />
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              name="activo"
              checked={formData.activo}
              onChange={handleChange}
            />
            Usuario activo
          </label>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn-cancel">
            Cancelar
          </button>
          <button type="submit" className="btn-submit">
            {usuario ? 'Modificar' : 'Agregar'}
          </button>
        </div>
      </form>
    </div>
  );
};

interface GestionarPermisosProps {
  usuario: Usuario;
  onClose: () => void;
  onUpdate: () => void;
}

interface PermisoAgrupado {
  modulo: string;
  nombreModulo: string;
  permisos: Permiso[];
  seccion: string;
  nombreSeccion: string;
}

interface SeccionAgrupada {
  seccion: string;
  nombreSeccion: string;
  modulos: PermisoAgrupado[];
}

const GestionarPermisos = ({ usuario, onClose, onUpdate }: GestionarPermisosProps) => {
  const [todosPermisos, setTodosPermisos] = useState<Permiso[]>([]);
  const [permisosUsuario, setPermisosUsuario] = useState<number[]>([]);
  const [moduloSeleccionado, setModuloSeleccionado] = useState<string | null>(null);
  const [seccionSeleccionada, setSeccionSeleccionada] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  // No permitir gestionar permisos del admin
  if (usuario.usuario === 'admin') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-permisos" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Gestionar Permisos - {usuario.usuario}</h2>
            <button onClick={onClose} className="btn-cerrar-modal">
              ✕
            </button>
          </div>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: '#718096', fontSize: '1.1rem' }}>
              No se pueden modificar los permisos del usuario administrador.
            </p>
            <p style={{ color: '#a0aec0', marginTop: '1rem' }}>
              El usuario administrador tiene acceso completo a todas las funcionalidades del sistema.
            </p>
          </div>
          <div className="modal-actions">
            <button onClick={onClose} className="btn-cancel">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    cargarDatos();
  }, [usuario]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [todos, delUsuario] = await Promise.all([
        apiService.getPermisos(),
        apiService.getPermisosUsuario(usuario.id),
      ]);
      setTodosPermisos(todos);
      setPermisosUsuario(delUsuario.map((p) => p.id));
      
      // Seleccionar la primera sección y módulo por defecto
      const modulosAgrupados = agruparPermisosPorModulo(todos);
      if (modulosAgrupados.length > 0) {
        setSeccionSeleccionada(modulosAgrupados[0].seccion);
        setModuloSeleccionado(modulosAgrupados[0].modulo);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar permisos');
    } finally {
      setLoading(false);
    }
  };

  // Agrupar permisos por módulo y sección
  const agruparPermisosPorModulo = (permisos: Permiso[]): PermisoAgrupado[] => {
    const grupos: Record<string, Permiso[]> = {};
    const nombresModulos: Record<string, string> = {
      socios: 'Socios',
      categorias: 'Categorías',
      liquidaciones: 'Liquidaciones',
      pagos: 'Pagos',
      listado_pagos: 'Listado Pagos',
      usuarios: 'Usuarios',
      cajas: 'Cajas',
      movimientos: 'Registrar Ingreso/Egreso',
      medios_pago: 'Medios de Pago',
      backup: 'Backup',
      tesoreria: 'Tesorería',
    };

    // Mapeo de módulos a secciones (según el orden del menú)
    const moduloSeccion: Record<string, string> = {
      socios: 'secretaria',
      categorias: 'secretaria',
      pagos: 'secretaria',
      listado_pagos: 'secretaria',
      liquidaciones: 'liquidaciones',
      tesoreria: 'tesoreria',
      cajas: 'tesoreria',
      movimientos: 'tesoreria',
      medios_pago: 'tesoreria',
      usuarios: 'seguridad',
      backup: 'seguridad',
    };

    const nombresSecciones: Record<string, string> = {
      secretaria: 'Secretaría',
      liquidaciones: 'Liquidaciones',
      tesoreria: 'Tesorería',
      seguridad: 'Seguridad',
    };

    permisos.forEach((permiso) => {
      let [modulo] = permiso.codigo.split('.');
      
      // Mapear permisos específicos a módulos separados
      if (modulo === 'pagos' && permiso.codigo === 'pagos.ver') {
        modulo = 'listado_pagos';
      } else if (modulo === 'cajas' && permiso.codigo === 'cajas.movimientos') {
        modulo = 'movimientos';
      }
      
      if (!grupos[modulo]) {
        grupos[modulo] = [];
      }
      grupos[modulo].push(permiso);
    });

    // Ordenar permisos dentro de cada módulo
    Object.keys(grupos).forEach((modulo) => {
      grupos[modulo].sort((a, b) => a.nombre.localeCompare(b.nombre));
    });

    // Orden de módulos dentro de cada sección (según el menú)
    const ordenModulos: Record<string, string[]> = {
      secretaria: ['socios', 'categorias', 'pagos', 'listado_pagos'],
      liquidaciones: ['liquidaciones'],
      tesoreria: ['tesoreria', 'cajas', 'movimientos', 'medios_pago'],
      seguridad: ['usuarios', 'backup'],
    };

    // Convertir a array con secciones
    const modulosConSeccion = Object.keys(grupos).map((modulo) => ({
      modulo,
      nombreModulo: nombresModulos[modulo] || modulo,
      permisos: grupos[modulo],
      seccion: moduloSeccion[modulo] || 'otros',
      nombreSeccion: nombresSecciones[moduloSeccion[modulo]] || 'Otros',
    }));

    // Ordenar primero por sección, luego por orden dentro de la sección
    return modulosConSeccion.sort((a, b) => {
      const ordenSecciones = ['secretaria', 'liquidaciones', 'tesoreria', 'seguridad', 'otros'];
      const ordenA = ordenSecciones.indexOf(a.seccion);
      const ordenB = ordenSecciones.indexOf(b.seccion);
      if (ordenA !== ordenB) {
        return ordenA - ordenB;
      }
      
      // Si están en la misma sección, ordenar según el orden definido
      const ordenModulosSeccion = ordenModulos[a.seccion] || [];
      const ordenModuloA = ordenModulosSeccion.indexOf(a.modulo);
      const ordenModuloB = ordenModulosSeccion.indexOf(b.modulo);
      
      if (ordenModuloA !== -1 && ordenModuloB !== -1) {
        return ordenModuloA - ordenModuloB;
      }
      if (ordenModuloA !== -1) return -1;
      if (ordenModuloB !== -1) return 1;
      
      return a.nombreModulo.localeCompare(b.nombreModulo);
    });
  };

  // Agrupar módulos por sección
  const agruparPorSeccion = (modulos: PermisoAgrupado[]): SeccionAgrupada[] => {
    const secciones: Record<string, PermisoAgrupado[]> = {};

    modulos.forEach((modulo) => {
      if (!secciones[modulo.seccion]) {
        secciones[modulo.seccion] = [];
      }
      secciones[modulo.seccion].push(modulo);
    });

    const ordenSecciones = ['secretaria', 'liquidaciones', 'tesoreria', 'seguridad', 'otros'];
    
    return ordenSecciones
      .filter((seccion) => secciones[seccion])
      .map((seccion) => ({
        seccion,
        nombreSeccion: modulos.find((m) => m.seccion === seccion)?.nombreSeccion || seccion,
        modulos: secciones[seccion],
      }));
  };

  const togglePermiso = (permisoId: number) => {
    setPermisosUsuario((prev) => {
      if (prev.includes(permisoId)) {
        return prev.filter((id) => id !== permisoId);
      } else {
        return [...prev, permisoId];
      }
    });
  };

  const toggleModulo = (modulo: PermisoAgrupado) => {
    const todosSeleccionados = modulo.permisos.every((p) => permisosUsuario.includes(p.id));
    
    if (todosSeleccionados) {
      // Desmarcar todos los permisos del módulo
      setPermisosUsuario((prev) => 
        prev.filter((id) => !modulo.permisos.some((p) => p.id === id))
      );
    } else {
      // Marcar todos los permisos del módulo
      const nuevosIds = modulo.permisos.map((p) => p.id).filter((id) => !permisosUsuario.includes(id));
      setPermisosUsuario((prev) => [...prev, ...nuevosIds]);
    }
  };

  const estaModuloCompleto = (modulo: PermisoAgrupado): boolean => {
    return modulo.permisos.length > 0 && modulo.permisos.every((p) => permisosUsuario.includes(p.id));
  };

  const estaModuloParcial = (modulo: PermisoAgrupado): boolean => {
    const seleccionados = modulo.permisos.filter((p) => permisosUsuario.includes(p.id)).length;
    return seleccionados > 0 && seleccionados < modulo.permisos.length;
  };

  const handleSeleccionarSeccion = (seccion: string) => {
    setSeccionSeleccionada(seccion);
    // Seleccionar el primer módulo de la sección
    const modulosAgrupados = agruparPermisosPorModulo(todosPermisos);
    const primerModulo = modulosAgrupados.find((m) => m.seccion === seccion);
    if (primerModulo) {
      setModuloSeleccionado(primerModulo.modulo);
    }
  };

  const handleGuardar = async () => {
    setGuardando(true);
    setError('');
    try {
      await apiService.asignarPermisosUsuario(usuario.id, permisosUsuario);
      onUpdate();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar permisos');
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-permisos">
          <h2>Gestionar Permisos - {usuario.usuario}</h2>
          <p>Cargando permisos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-permisos" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Gestionar Permisos - {usuario.usuario}</h2>
          <button onClick={onClose} className="btn-cerrar-modal">
            ✕
          </button>
        </div>

        <div className="permisos-acciones">
          <button
            type="button"
            onClick={() => {
              // Marcar todos
              setPermisosUsuario(todosPermisos.map((p) => p.id));
            }}
            className="btn-marcar-todos"
          >
            ✓ Marcar Todos
          </button>
          <button
            type="button"
            onClick={() => {
              // Desmarcar todos
              setPermisosUsuario([]);
            }}
            className="btn-desmarcar-todos"
          >
            ✗ Desmarcar Todos
          </button>
        </div>

        <div className="permisos-grid">
          <div className="secciones-panel">
            <div className="panel-header">
              <h3>Secciones</h3>
            </div>
            <div className="secciones-lista">
              {agruparPorSeccion(agruparPermisosPorModulo(todosPermisos)).map((seccion) => {
                const seleccionada = seccionSeleccionada === seccion.seccion;
                
                return (
                  <div
                    key={seccion.seccion}
                    className={`seccion-card ${seleccionada ? 'activa' : ''}`}
                    onClick={() => handleSeleccionarSeccion(seccion.seccion)}
                  >
                    <strong className="seccion-nombre">{seccion.nombreSeccion}</strong>
                    <span className="seccion-count">{seccion.modulos.length} módulos</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="modulos-panel">
            <div className="panel-header">
              <h3>
                {seccionSeleccionada
                  ? agruparPorSeccion(agruparPermisosPorModulo(todosPermisos)).find((s) => s.seccion === seccionSeleccionada)?.nombreSeccion || 'Módulos'
                  : 'Selecciona una sección'}
              </h3>
            </div>
            {seccionSeleccionada ? (
              <div className="modulos-lista">
                {agruparPorSeccion(agruparPermisosPorModulo(todosPermisos))
                  .find((s) => s.seccion === seccionSeleccionada)
                  ?.modulos.map((modulo) => {
                    const completo = estaModuloCompleto(modulo);
                    const parcial = estaModuloParcial(modulo);
                    const seleccionado = moduloSeleccionado === modulo.modulo;
                    const cantidadSeleccionados = modulo.permisos.filter((p) => permisosUsuario.includes(p.id)).length;

                    return (
                      <div
                        key={modulo.modulo}
                        className={`modulo-card ${seleccionado ? 'activo' : ''}`}
                        onClick={() => setModuloSeleccionado(modulo.modulo)}
                      >
                        <div className="modulo-card-header">
                          <label
                            className="modulo-checkbox-label"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={completo}
                              ref={(input) => {
                                if (input) input.indeterminate = parcial;
                              }}
                              onChange={() => toggleModulo(modulo)}
                            />
                            <span className="modulo-icon">📁</span>
                            <strong className="modulo-nombre">{modulo.nombreModulo}</strong>
                          </label>
                        </div>
                        <div className="modulo-card-footer">
                          <span className="modulo-stats">
                            {cantidadSeleccionados}/{modulo.permisos.length} permisos
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="modulos-vacio">
                <p>Selecciona una sección de la izquierda para ver sus módulos</p>
              </div>
            )}
          </div>

          <div className="permisos-panel">
            <div className="panel-header">
              <h3>
                {moduloSeleccionado
                  ? agruparPermisosPorModulo(todosPermisos).find((m) => m.modulo === moduloSeleccionado)?.nombreModulo || 'Permisos'
                  : 'Selecciona un módulo'}
              </h3>
            </div>
            {moduloSeleccionado && (
              <div className="permisos-grid-lista">
                {agruparPermisosPorModulo(todosPermisos)
                  .find((m) => m.modulo === moduloSeleccionado)
                  ?.permisos.map((permiso) => (
                    <label key={permiso.id} className="permiso-card">
                      <input
                        type="checkbox"
                        checked={permisosUsuario.includes(permiso.id)}
                        onChange={() => togglePermiso(permiso.id)}
                      />
                      <div className="permiso-content">
                        <div className="permiso-nombre">{permiso.nombre}</div>
                        {permiso.descripcion && (
                          <div className="permiso-desc">{permiso.descripcion}</div>
                        )}
                      </div>
                    </label>
                  ))}
              </div>
            )}
            {!moduloSeleccionado && (
              <div className="permisos-vacio">
                <p>Selecciona un módulo de la izquierda para ver sus permisos</p>
              </div>
            )}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="modal-actions">
          <button onClick={onClose} className="btn-cancel" disabled={guardando}>
            Cancelar
          </button>
          <button onClick={handleGuardar} className="btn-submit" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar Permisos'}
          </button>
        </div>
      </div>
    </div>
  );
};

