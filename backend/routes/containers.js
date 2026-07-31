// routes/containers.js
const express = require('express');
const { requireAuth } = require('../lib/authMiddleware');
const dockerLib = require('../lib/docker');

const router = express.Router();
router.use(requireAuth);

// GET /api/containers — lista todos, com uso de CPU/memória de cada um
router.get('/', async (req, res) => {
  try {
    const containers = await dockerLib.listContainers();
    const withStats = await Promise.all(
      containers.map(async (c) => {
        if (c.status !== 'on') return { ...c, cpu: '—', mem: '—' };
        try {
          const stats = await dockerLib.getContainerStats(c.id);
          return { ...c, cpu: `${stats.cpuPercent}%`, mem: `${stats.memUsageMB} MB` };
        } catch {
          return { ...c, cpu: '—', mem: '—' };
        }
      })
    );
    res.json(withStats);
  } catch (err) {
    console.error('[containers] erro ao listar:', err.message);
    res.status(500).json({ error: 'não foi possível falar com o Docker — verifique se /var/run/docker.sock está montado' });
  }
});

router.post('/:id/start', async (req, res) => {
  try {
    await dockerLib.startContainer(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/stop', async (req, res) => {
  try {
    await dockerLib.stopContainer(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/restart', async (req, res) => {
  try {
    await dockerLib.restartContainer(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/logs', async (req, res) => {
  try {
    const logs = await dockerLib.getLogs(req.params.id, Number(req.query.tail) || 200);
    res.type('text/plain').send(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
