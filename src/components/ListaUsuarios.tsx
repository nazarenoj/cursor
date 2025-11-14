import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type { Usuario, Permiso } from '../types';
import './ListaUsuarios.css';

export const ListaUsuarios = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | undefined>(undefined);
  const [usuarioPermisos, setUsuarioPermisos] = useState<Usuario | undefined>(undefined);
  const [error, setError] = useState('');

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
        <table className="tabla-usuarios">
          <thead>
            <tr>
              <th>ID</th>
              <th>Usuario</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan={4} className="sin-datos">
                  No hay usuarios registrados.
                </td>
              </tr>
            ) : (
              usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td>{usuario.id}</td>
                  <td>{usuario.usuario}</td>
                  <td>
                    <span className={`badge ${usuario.activo ? 'badge-activo' : 'badge-inactivo'}`}>
                      {usuario.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
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
    usuario: usuario?.usuario || '',
    password: '',
    activo: usuario?.activo ?? true,
  });

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

const GestionarPermisos = ({ usuario, onClose, onUpdate }: GestionarPermisosProps) => {
  const [todosPermisos, setTodosPermisos] = useState<Permiso[]>([]);
  const [permisosUsuario, setPermisosUsuario] = useState<number[]>([]);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar permisos');
    } finally {
      setLoading(false);
    }
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

        <div className="permisos-lista">
          {todosPermisos.map((permiso) => (
            <label key={permiso.id} className="permiso-item">
              <input
                type="checkbox"
                checked={permisosUsuario.includes(permiso.id)}
                onChange={() => togglePermiso(permiso.id)}
              />
              <div>
                <strong>{permiso.nombre}</strong>
                {permiso.descripcion && <p className="permiso-desc">{permiso.descripcion}</p>}
              </div>
            </label>
          ))}
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

