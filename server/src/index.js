require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { initDb } = require('./db');
const categoriasRouter = require('./routes/categorias');
const sociosRouter = require('./routes/socios');
const liquidacionesRouter = require('./routes/liquidaciones');
const authRouter = require('./routes/auth');
const usuariosRouter = require('./routes/usuarios');
const permisosRouter = require('./routes/permisos');

const PORT = Number(process.env.PORT || 4000);

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rutas públicas (sin autenticación)
app.use('/api', authRouter);

// Rutas protegidas (requieren autenticación)
app.use('/api/categorias', categoriasRouter);
app.use('/api/socios', sociosRouter);
app.use('/api', liquidacionesRouter);
app.use('/api', usuariosRouter);
app.use('/api', permisosRouter);

// Middleware de manejo de errores
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Error interno del servidor',
    details: err.details,
  });
});

const startServer = async () => {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`Servidor API escuchando en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Error al inicializar el servidor:', error);
    process.exit(1);
  }
};

startServer();


