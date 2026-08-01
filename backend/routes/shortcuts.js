// routes/shortcuts.js — links externos adicionados pelo usuário na Visão Geral
const express = require('express');
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../lib/authMiddleware');
const { DATA_DIR } = require('../lib/config');

const router = express.Router();
router.use(requireAuth);

const SHORTCUTS_PATH = path.join(DATA_DIR, 'shortcuts.json');

function readShortcuts() {
  if (!fs.existsSync(SHORTCUTS_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(SHORTCUTS_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function writeShortcuts(list) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SHORTCUTS_PATH, JSON.stringify(list, null, 2), 'utf-8');
}

router.get('/', (req, res) => {
  res.json(readShortcuts());
});

router.post('/', (req, res) => {
  const { url, title, icon } = req.body || {};
  if (!url || !title) {
    return res.status(400).json({ error: 'URL e título são obrigatórios' });
  }
  const list = readShortcuts();
  const item = { id: Date.now().toString(36), url, title, icon: icon || '' };
  list.push(item);
  writeShortcuts(list);
  res.json(item);
});

router.delete('/:id', (req, res) => {
  const list = readShortcuts().filter((s) => s.id !== req.params.id);
  writeShortcuts(list);
  res.json({ ok: true });
});

module.exports = router;
