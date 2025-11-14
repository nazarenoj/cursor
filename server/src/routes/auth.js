const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post(
  '/auth/login',
  asyncHandler(async (req, res) => {
    const { usuario, password } = req.body || {};

    if (!usuario || !password) {
      const error = new Error('Usuario y contraseña son requeridos');
      error.status = 400;
      throw error;
    }

    const rows = await query(
      'SELECT id, usuario, password_hash, activo FROM usuarios WHERE usuario = ? LIMIT 1',
      [usuario],
    );

    if (rows.length === 0) {
      const error = new Error('Usuario o contraseña incorrectos');
      error.status = 401;
      throw error;
    }

    const user = rows[0];

    if (!user.activo) {
      const error = new Error('Usuario inactivo');
      error.status = 403;
      throw error;
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      const error = new Error('Usuario o contraseña incorrectos');
      error.status = 401;
      throw error;
    }

    const token = jwt.sign(
      { id: user.id, usuario: user.usuario },
      JWT_SECRET,
      { expiresIn: '24h' },
    );

    res.json({
      token,
      user: {
        id: user.id,
        usuario: user.usuario,
      },
    });
  }),
);

router.get(
  '/auth/me',
  asyncHandler(async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const rows = await query(
        'SELECT id, usuario, activo FROM usuarios WHERE id = ? LIMIT 1',
        [decoded.id],
      );

      if (rows.length === 0 || !rows[0].activo) {
        return res.status(401).json({ message: 'Usuario no encontrado o inactivo' });
      }

      res.json({
        id: rows[0].id,
        usuario: rows[0].usuario,
      });
    } catch (err) {
      return res.status(401).json({ message: 'Token inválido' });
    }
  }),
);

module.exports = router;

