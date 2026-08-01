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

// POST /api/containers — cria e inicia um container a partir de uma imagem
// Docker (usado pelo formulário "App personalizado" da Aether Store).
router.post('/', async (req, res) => {
  const { image, tag, name, ports, volumes, env, network, privileged, memoryMB, restartPolicy } = req.body || {};
  if (!image || !name) {
    return res.status(400).json({ error: 'imagem Docker e título são obrigatórios' });
  }
  const fullImage = tag ? `${image}:${tag}` : image;
  try {
    const id = await dockerLib.createContainer({
      image: fullImage,
      name: name.toLowerCase().replace(/\s+/g, '-'),
      ports: ports || [],
      volumes: volumes || [],
      env: env || [],
      network: network || 'bridge',
      privileged: !!privileged,
      memoryMB: memoryMB ? Number(memoryMB) : undefined,
      restartPolicy: restartPolicy || 'unless-stopped',
    });
    res.json({ ok: true, id });
  } catch (err) {
    console.error('[containers] erro ao criar:', err.message);
    res.status(500).json({ error: `não foi possível criar o container: ${err.message}` });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await dockerLib.removeContainer(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
