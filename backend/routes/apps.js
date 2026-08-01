// routes/apps.js — "Aether Store"
//
// Combina o catálogo próprio (data/apps-catalog.json) com o catálogo público
// do CasaOS AppStore (sincronizado via lib/casaosStore.js). Créditos ao
// catálogo original: https://github.com/IceWhaleTech/CasaOS-AppStore (Apache-2.0)

const express = require('express');
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../lib/authMiddleware');
const casaosStore = require('../lib/casaosStore');

const router = express.Router();
router.use(requireAuth);

const CATALOG_PATH = path.join(__dirname, '..', 'data', 'apps-catalog.json');

function readLocalCatalog() {
  try {
    const raw = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
    return raw.map((a) => ({ ...a, source: 'aether' }));
  } catch (err) {
    console.error('[apps] erro ao ler catálogo local:', err.message);
    return [];
  }
}

// GET /api/apps — catálogo combinado. ?source=aether|casaos filtra a origem.
// ?category=Nome filtra por categoria (só afeta os apps do CasaOS por ora).
router.get('/', (req, res) => {
  const local = readLocalCatalog();
  const casaos = casaosStore.getCasaOSCatalog();
  let combined = [...local, ...casaos];

  if (req.query.source) {
    combined = combined.filter((a) => a.source === req.query.source);
  }
  if (req.query.category) {
    combined = combined.filter((a) => (a.category || '').toLowerCase() === req.query.category.toLowerCase());
  }

  res.json({ apps: combined, total: combined.length, casaosSynced: casaos.length > 0 });
});

// POST /api/apps/refresh-casaos-store — força uma nova sincronização (pode demorar alguns segundos)
router.post('/refresh-casaos-store', async (req, res) => {
  const result = await casaosStore.syncCasaOSCatalog();
  if (!result) return res.status(502).json({ error: 'falha ao sincronizar com o CasaOS AppStore' });
  res.json({ ok: true, syncedAt: result.syncedAt, count: result.count });
});

// POST /api/apps/:id/install — sobe o docker-compose do app via dockerode.
// Ainda não implementado: precisa resolver variáveis (${WEBUI_PORT} etc.) e
// aplicar o compose parseado. Fica pra próxima etapa.
router.post('/:id/install', async (req, res) => {
  res.status(501).json({ error: 'instalação automática ainda não implementada nesta versão' });
});

module.exports = router;
