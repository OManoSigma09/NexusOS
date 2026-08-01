// server.js — ponto de entrada do backend do AetherOS
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./routes/auth');
const containerRoutes = require('./routes/containers');
const systemRoutes = require('./routes/system');
const appRoutes = require('./routes/apps');
const shortcutRoutes = require('./routes/shortcuts');
const casaosStore = require('./lib/casaosStore');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

// API
app.use('/api/auth', authRoutes);
app.use('/api/containers', containerRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/apps', appRoutes);
app.use('/api/shortcuts', shortcutRoutes);

// Frontend estático (a pasta frontend/ com o index.html liquid glass)
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_DIR));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'rota não encontrada' });
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[aetheros] rodando na porta ${PORT}`);
  // primeira sincronização do catálogo da Aether Store roda em background,
  // sem travar o boot do servidor; depois repete a cada 24h.
  casaosStore.syncCasaOSCatalog();
  setInterval(() => casaosStore.syncCasaOSCatalog(), 24 * 60 * 60 * 1000);
});
