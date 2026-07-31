// lib/authMiddleware.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.AETHEROS_JWT_SECRET || 'troque-isso-no-.env-em-producao';

function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.aetheros_session;
  if (!token) return res.status(401).json({ error: 'não autenticado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'sessão inválida ou expirada' });
  }
}

function signSession(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = { requireAuth, signSession, JWT_SECRET };
