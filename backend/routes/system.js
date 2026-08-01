// routes/system.js
const express = require('express');
const { requireAuth } = require('../lib/authMiddleware');
const systemLib = require('../lib/system');

const router = express.Router();
router.use(requireAuth);

router.get('/stats', async (req, res) => {
  try {
    const stats = await systemLib.getStats();
    res.json(stats);
  } catch (err) {
    console.error('[system] erro ao coletar métricas:', err.message);
    res.status(500).json({ error: 'falha ao coletar métricas do sistema' });
  }
});

router.get('/info', async (req, res) => {
  try {
    const info = await systemLib.getInfo();
    res.json(info);
  } catch (err) {
    console.error('[system] erro ao coletar informações:', err.message);
    res.status(500).json({ error: 'falha ao coletar informações do sistema' });
  }
});

module.exports = router;
