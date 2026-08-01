// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { readConfig, writeConfig } = require('../lib/config');
const { signSession, requireAuth } = require('../lib/authMiddleware');

const router = express.Router();
const isProd = process.env.NODE_ENV === 'production';

// GET /api/auth/status — o frontend usa isso pra decidir: wizard, login ou painel?
router.get('/status', (req, res) => {
  const cfg = readConfig();
  res.json({
    firstRun: cfg.firstRun,
    hostname: cfg.hostname,
    theme: cfg.theme,
    wallpaper: cfg.wallpaper,
  });
});

// POST /api/auth/setup — só funciona enquanto firstRun === true (assistente inicial)
router.post('/setup', async (req, res) => {
  const cfg = readConfig();
  if (!cfg.firstRun) {
    return res.status(403).json({ error: 'o sistema já foi configurado' });
  }

  const { hostname, username, password, theme, wallpaper } = req.body || {};
  if (!username || !password || password.length < 4) {
    return res.status(400).json({ error: 'usuário e senha (mín. 4 caracteres) são obrigatórios' });
  }

  const adminPasswordHash = await bcrypt.hash(password, 10);
  const updated = writeConfig({
    firstRun: false,
    hostname: hostname || cfg.hostname,
    adminUser: username,
    adminPasswordHash,
    theme: theme || cfg.theme,
    wallpaper: wallpaper || cfg.wallpaper,
    createdAt: new Date().toISOString(),
  });

  res.json({ ok: true, hostname: updated.hostname });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const cfg = readConfig();
  if (cfg.firstRun) {
    return res.status(400).json({ error: 'execute o assistente de configuração primeiro' });
  }

  const { username, password } = req.body || {};
  const valid = username === cfg.adminUser &&
    cfg.adminPasswordHash &&
    await bcrypt.compare(password || '', cfg.adminPasswordHash);

  if (!valid) {
    return res.status(401).json({ error: 'usuário ou senha incorretos' });
  }

  const token = signSession({ user: username });
  res.cookie('aetheros_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({ ok: true, user: username });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('aetheros_session');
  res.json({ ok: true });
});

// GET /api/auth/me — pra frontend confirmar sessão ativa depois de F5
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user.user });
});

module.exports = router;
