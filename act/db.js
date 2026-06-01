const mysql = require('mysql2/promise');

const DB_NAME = process.env.DB_NAME || 'club_social';

const baseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'GL2025',
  charset: 'utf8mb4',
  timezone: 'local', // Usar zona horaria local en lugar de UTC
};

let pool;

const getPool = () => {
  if (!pool) {
    pool = mysql.createPool({
      ...baseConfig,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true,
    });
  }

  return pool;
};

const createDatabaseIfNeeded = async () => {
  const connection = await mysql.createConnection(baseConfig);
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci`,
    );
  } finally {
    await connection.end();
  }
};

const withTransaction = async (handler) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await handler(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

const initDb = async () => {
  await createDatabaseIfNeeded();
  const poolInstance = getPool();

  // Categorías
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL UNIQUE,
      costo_cuota DECIMAL(10,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
  `);

  // Socios
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS socios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      numero_socio INT NOT NULL UNIQUE,
      apellido VARCHAR(255) NOT NULL,
      nombre VARCHAR(255) NOT NULL,
      dni VARCHAR(15) NOT NULL,
      fecha_nacimiento DATE NOT NULL,
      calle VARCHAR(255) NOT NULL,
      numero_casa VARCHAR(50) NOT NULL,
      localidad VARCHAR(255) NOT NULL,
      provincia VARCHAR(255) NOT NULL,
      telefono VARCHAR(50),
      email VARCHAR(255),
      categoria_id INT NOT NULL,
      obra_social VARCHAR(255),
      numero_afiliado VARCHAR(255),
      fecha_alta DATE NOT NULL,
      fecha_baja DATE DEFAULT NULL,
      foto VARCHAR(500) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_socios_categoria FOREIGN KEY (categoria_id)
        REFERENCES categorias(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
  `);

  // Agregar columna foto si no existe (para migración)
  try {
    await poolInstance.query(`
      ALTER TABLE socios ADD COLUMN foto VARCHAR(500) DEFAULT NULL
    `);
  } catch (err) {
    // La columna ya existe, ignorar error
  }

  // Adherentes
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS adherentes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      socio_id INT NOT NULL,
      apellido VARCHAR(255) NOT NULL,
      nombre VARCHAR(255) NOT NULL,
      dni VARCHAR(15) NOT NULL,
      fecha_nacimiento DATE NOT NULL,
      parentesco VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_adherentes_socio FOREIGN KEY (socio_id)
        REFERENCES socios(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
  `);

  // Liquidaciones mensuales
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS liquidaciones_mensuales (
      id INT AUTO_INCREMENT PRIMARY KEY,
      mes CHAR(7) NOT NULL UNIQUE,
      fecha_liquidacion DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
  `);

  // Liquidaciones cuotas
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS liquidaciones_cuotas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      liquidacion_mensual_id INT NOT NULL,
      socio_id INT NOT NULL,
      numero_socio INT NOT NULL,
      apellido VARCHAR(255) NOT NULL,
      nombre VARCHAR(255) NOT NULL,
      categoria_id INT NOT NULL,
      categoria_nombre VARCHAR(255) NOT NULL,
      monto DECIMAL(10,2) NOT NULL,
      pagado TINYINT(1) NOT NULL DEFAULT 0,
      fecha_pago DATE DEFAULT NULL,
      medio_pago TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_liq_cuota_mensual FOREIGN KEY (liquidacion_mensual_id)
        REFERENCES liquidaciones_mensuales(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
      CONSTRAINT fk_liq_cuota_socio FOREIGN KEY (socio_id)
        REFERENCES socios(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
  `);

  // Usuarios
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      activo TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
  `);

  // Permisos
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS permisos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      codigo VARCHAR(100) NOT NULL UNIQUE,
      nombre VARCHAR(255) NOT NULL,
      descripcion TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
  `);

  // Relación Usuario-Permiso
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS usuario_permisos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT NOT NULL,
      permiso_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_usuario_permiso (usuario_id, permiso_id),
      CONSTRAINT fk_up_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
      CONSTRAINT fk_up_permiso FOREIGN KEY (permiso_id)
        REFERENCES permisos(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
  `);

  // Cajas/Cuentas
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS cajas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL UNIQUE,
      descripcion TEXT,
      saldo_inicial DECIMAL(10,2) NOT NULL DEFAULT 0,
      activa TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
  `);

  // Medios de Pago
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS medios_pago (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL UNIQUE,
      descripcion TEXT,
      caja_id INT,
      tipo_movimiento ENUM('ingreso', 'egreso', 'ambos') NOT NULL DEFAULT 'ambos',
      activo TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_medio_pago_caja FOREIGN KEY (caja_id)
        REFERENCES cajas(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
  `);

  // Agregar columna tipo_movimiento si no existe (para migración)
  try {
    const [columns] = await poolInstance.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'medios_pago' 
      AND COLUMN_NAME = 'tipo_movimiento'
    `, [DB_NAME]);
    
    if (columns.length === 0) {
      await poolInstance.query(`
        ALTER TABLE medios_pago 
        ADD COLUMN tipo_movimiento ENUM('ingreso', 'egreso', 'ambos') NOT NULL DEFAULT 'ambos'
      `);
      console.log('Columna tipo_movimiento agregada a medios_pago');
    }
  } catch (err) {
    // Error al verificar o agregar columna, pero continuar
    console.error('Error al agregar columna tipo_movimiento:', err.message);
  }

  // Tabla intermedia para relación muchos-a-muchos entre medios_pago y cajas
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS medio_pago_cajas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      medio_pago_id INT NOT NULL,
      caja_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_medio_caja (medio_pago_id, caja_id),
      CONSTRAINT fk_mpc_medio_pago FOREIGN KEY (medio_pago_id)
        REFERENCES medios_pago(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
      CONSTRAINT fk_mpc_caja FOREIGN KEY (caja_id)
        REFERENCES cajas(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
  `);

  // Movimientos de Cajas (ingresos y egresos)
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS movimientos_cajas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      caja_id INT NOT NULL,
      tipo ENUM('ingreso', 'egreso') NOT NULL,
      monto DECIMAL(10,2) NOT NULL,
      concepto VARCHAR(255) NOT NULL,
      descripcion TEXT,
      medio_pago_id INT,
      liquidacion_cuota_id INT,
      fecha DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_mov_caja FOREIGN KEY (caja_id)
        REFERENCES cajas(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
      CONSTRAINT fk_mov_medio_pago FOREIGN KEY (medio_pago_id)
        REFERENCES medios_pago(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
      CONSTRAINT fk_mov_liquidacion FOREIGN KEY (liquidacion_cuota_id)
        REFERENCES liquidaciones_cuotas(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
  `);

  // Configuración de backup
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS backup_config (
      id INT PRIMARY KEY DEFAULT 1,
      config JSON NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
  `);

  // Inicializar permisos y usuario admin
  await initPermisosYAdmin();
};

const initPermisosYAdmin = async () => {
  const bcrypt = require('bcryptjs');
  const poolInstance = getPool();

  // Definir permisos del sistema (permisos granulares)
  const permisosDef = [
    // Socios
    { codigo: 'socios.ver', nombre: 'Ver Socios', descripcion: 'Ver listado de socios' },
    { codigo: 'socios.crear', nombre: 'Crear Socios', descripcion: 'Agregar nuevos socios' },
    { codigo: 'socios.modificar', nombre: 'Modificar Socios', descripcion: 'Editar información de socios' },
    { codigo: 'socios.eliminar', nombre: 'Eliminar Socios', descripcion: 'Eliminar socios del sistema' },
    { codigo: 'socios.exportar', nombre: 'Exportar Socios', descripcion: 'Exportar listados de socios a PDF' },
    { codigo: 'socios.whatsapp', nombre: 'Enviar WhatsApp a Socios', descripcion: 'Enviar mensajes por WhatsApp a socios' },
    { codigo: 'socios.liquidaciones', nombre: 'Ver Liquidaciones de Socio', descripcion: 'Ver liquidaciones individuales de un socio' },
    
    // Categorías
    { codigo: 'categorias.ver', nombre: 'Ver Categorías', descripcion: 'Ver listado de categorías' },
    { codigo: 'categorias.crear', nombre: 'Crear Categorías', descripcion: 'Agregar nuevas categorías' },
    { codigo: 'categorias.modificar', nombre: 'Modificar Categorías', descripcion: 'Editar información de categorías' },
    { codigo: 'categorias.eliminar', nombre: 'Eliminar Categorías', descripcion: 'Eliminar categorías del sistema' },
    { codigo: 'categorias.exportar', nombre: 'Exportar Categorías', descripcion: 'Exportar listados de categorías a PDF' },
    
    // Liquidaciones
    { codigo: 'liquidaciones.ver', nombre: 'Ver Liquidaciones', descripcion: 'Ver listado de liquidaciones' },
    { codigo: 'liquidaciones.crear', nombre: 'Crear Liquidaciones', descripcion: 'Generar nuevas liquidaciones mensuales' },
    { codigo: 'liquidaciones.crear_anuales', nombre: 'Crear Liquidaciones Anuales', descripcion: 'Generar liquidaciones anuales por socios' },
    { codigo: 'liquidaciones.modificar', nombre: 'Modificar Liquidaciones', descripcion: 'Editar liquidaciones existentes' },
    { codigo: 'liquidaciones.eliminar', nombre: 'Eliminar Liquidaciones', descripcion: 'Eliminar liquidaciones del sistema' },
    { codigo: 'liquidaciones.exportar', nombre: 'Exportar Liquidaciones', descripcion: 'Exportar liquidaciones a PDF' },
    { codigo: 'liquidaciones.whatsapp', nombre: 'Enviar Liquidaciones por WhatsApp', descripcion: 'Enviar liquidaciones por WhatsApp' },
    
    // Pagos
    { codigo: 'pagos.registrar', nombre: 'Registrar Cobros', descripcion: 'Registrar pagos de cuotas' },
    { codigo: 'pagos.anular', nombre: 'Anular Cobros', descripcion: 'Anular pagos registrados' },
    { codigo: 'pagos.ver', nombre: 'Ver Cobros', descripcion: 'Ver listado de cobros registrados' },
    { codigo: 'pagos.exportar', nombre: 'Exportar Cobros', descripcion: 'Exportar listados de cobros' },
    
    // Usuarios
    { codigo: 'usuarios.ver', nombre: 'Ver Usuarios', descripcion: 'Ver listado de usuarios' },
    { codigo: 'usuarios.crear', nombre: 'Crear Usuarios', descripcion: 'Agregar nuevos usuarios' },
    { codigo: 'usuarios.modificar', nombre: 'Modificar Usuarios', descripcion: 'Editar información de usuarios' },
    { codigo: 'usuarios.eliminar', nombre: 'Eliminar Usuarios', descripcion: 'Eliminar usuarios del sistema' },
    { codigo: 'usuarios.permisos', nombre: 'Gestionar Permisos', descripcion: 'Asignar y modificar permisos de usuarios' },
    
    // Cajas
    { codigo: 'cajas.ver', nombre: 'Ver Cajas', descripcion: 'Ver listado de cajas' },
    { codigo: 'cajas.crear', nombre: 'Crear Cajas', descripcion: 'Crear nuevas cajas' },
    { codigo: 'cajas.modificar', nombre: 'Modificar Cajas', descripcion: 'Editar información de cajas' },
    { codigo: 'cajas.cerrar', nombre: 'Cerrar Cajas', descripcion: 'Cerrar cajas y generar resúmenes' },
    { codigo: 'cajas.movimientos', nombre: 'Gestionar Movimientos', descripcion: 'Registrar ingresos y egresos en cajas' },
    
    // Medios de Pago
    { codigo: 'medios_pago.ver', nombre: 'Ver Medios de Pago', descripcion: 'Ver listado de medios de pago' },
    { codigo: 'medios_pago.crear', nombre: 'Crear Medios de Pago', descripcion: 'Agregar nuevos medios de pago' },
    { codigo: 'medios_pago.modificar', nombre: 'Modificar Medios de Pago', descripcion: 'Editar medios de pago' },
    { codigo: 'medios_pago.eliminar', nombre: 'Eliminar Medios de Pago', descripcion: 'Eliminar medios de pago' },
    
    // Backup
    { codigo: 'backup.ver', nombre: 'Ver Backups', descripcion: 'Ver listado de backups disponibles' },
    { codigo: 'backup.ejecutar', nombre: 'Ejecutar Backups', descripcion: 'Ejecutar backups manualmente' },
    { codigo: 'backup.configurar', nombre: 'Configurar Backups', descripcion: 'Configurar parámetros de backup' },
    { codigo: 'backup.restaurar', nombre: 'Restaurar Backups', descripcion: 'Restaurar backups del sistema' },
    
    // Tesorería
    { codigo: 'tesoreria.ver', nombre: 'Ver Tesorería', descripcion: 'Ver resumen de tesorería' },
    { codigo: 'tesoreria.exportar', nombre: 'Exportar Tesorería', descripcion: 'Exportar reportes de tesorería' },
  ];

  // Insertar o actualizar permisos
  for (const permiso of permisosDef) {
    const [existentes] = await poolInstance.execute(
      'SELECT id FROM permisos WHERE codigo = ? LIMIT 1',
      [permiso.codigo],
    );

    if (existentes.length === 0) {
      await poolInstance.execute(
        'INSERT INTO permisos (codigo, nombre, descripcion) VALUES (?, ?, ?)',
        [permiso.codigo, permiso.nombre, permiso.descripcion],
      );
    } else {
      // Actualizar el nombre y descripción si ya existe
      await poolInstance.execute(
        'UPDATE permisos SET nombre = ?, descripcion = ? WHERE codigo = ?',
        [permiso.nombre, permiso.descripcion, permiso.codigo],
      );
    }
  }

  // Inicializar usuario admin por defecto si no existe
  const [existentes] = await poolInstance.execute(
    'SELECT id FROM usuarios WHERE usuario = ? LIMIT 1',
    ['admin'],
  );

  let adminId;
  if (existentes.length === 0) {
    const passwordHash = await bcrypt.hash('admin', 10);
    const [insertResult] = await poolInstance.execute(
      'INSERT INTO usuarios (usuario, password_hash, activo) VALUES (?, ?, ?)',
      ['admin', passwordHash, 1],
    );
    adminId = insertResult.insertId;
    console.log('Usuario admin creado por defecto (usuario: admin, contraseña: admin)');
  } else {
    adminId = existentes[0].id;
  }

  // Asignar TODOS los permisos al usuario admin
  // Primero, eliminar todos los permisos existentes del admin para asegurar una asignación limpia
  await poolInstance.execute(
    'DELETE FROM usuario_permisos WHERE usuario_id = ?',
    [adminId],
  );

  // Obtener todos los IDs de permisos disponibles
  const [todosLosPermisos] = await poolInstance.execute('SELECT id FROM permisos');

  // Insertar todos los permisos para el admin de una vez
  if (todosLosPermisos.length > 0) {
    const valoresPermisos = todosLosPermisos.map((permiso) => [adminId, permiso.id]);
    await poolInstance.query(
      'INSERT INTO usuario_permisos (usuario_id, permiso_id) VALUES ?',
      [valoresPermisos],
    );
    console.log(`Se asignaron ${todosLosPermisos.length} permisos al usuario admin`);
  }
};

const query = async (sql, params = []) => {
  const [rows, fields] = await getPool().execute(sql, params);
  return rows;
};

// Función para ejecutar queries que necesitan el resultado completo (INSERT, UPDATE, DELETE)
const execute = async (sql, params = []) => {
  const [result] = await getPool().execute(sql, params);
  return result;
};

module.exports = {
  getPool,
  initDb,
  query,
  execute,
  withTransaction,
};


