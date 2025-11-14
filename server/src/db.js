const mysql = require('mysql2/promise');

const DB_NAME = process.env.DB_NAME || 'club_social';

const baseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'GL2025',
  charset: 'utf8mb4',
  timezone: 'Z',
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_socios_categoria FOREIGN KEY (categoria_id)
        REFERENCES categorias(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
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

  // Inicializar permisos y usuario admin
  await initPermisosYAdmin();
};

const initPermisosYAdmin = async () => {
  const bcrypt = require('bcryptjs');
  const poolInstance = getPool();

  // Definir permisos del sistema
  const permisosDef = [
    { codigo: 'socios', nombre: 'Gestión de Socios', descripcion: 'Acceso completo a la gestión de socios' },
    { codigo: 'categorias', nombre: 'Gestión de Categorías', descripcion: 'Acceso completo a la gestión de categorías' },
    { codigo: 'liquidaciones', nombre: 'Gestión de Liquidaciones', descripcion: 'Acceso completo a la gestión de liquidaciones' },
    { codigo: 'pagos', nombre: 'Registro de Cobros', descripcion: 'Acceso al registro de cobros de cuotas' },
    { codigo: 'listado_pagos', nombre: 'Listado de Cobros', descripcion: 'Acceso al listado y consulta de cobros' },
    { codigo: 'usuarios', nombre: 'Gestión de Usuarios', descripcion: 'Acceso a la gestión de usuarios y permisos' },
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

  // Asignar todos los permisos al usuario admin
  const [todosPermisos] = await poolInstance.execute('SELECT id FROM permisos');
  for (const permiso of todosPermisos) {
    const [existentes] = await poolInstance.execute(
      'SELECT id FROM usuario_permisos WHERE usuario_id = ? AND permiso_id = ? LIMIT 1',
      [adminId, permiso.id],
    );

    if (existentes.length === 0) {
      await poolInstance.execute(
        'INSERT INTO usuario_permisos (usuario_id, permiso_id) VALUES (?, ?)',
        [adminId, permiso.id],
      );
    }
  }
};

const query = async (sql, params = []) => {
  const [rows] = await getPool().execute(sql, params);
  return rows;
};

module.exports = {
  getPool,
  initDb,
  query,
  withTransaction,
};


