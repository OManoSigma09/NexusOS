// lib/config.js
// Config persistida em disco (data/config.json) — sobrevive a reinícios do container
// porque o docker-compose monta ./data como volume.

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.AETHEROS_DATA_DIR || path.join(__dirname, '..', 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

const DEFAULT_CONFIG = {
  firstRun: true,
  hostname: 'aetheros-server',
  adminUser: null,
  adminPasswordHash: null,
  theme: 'dark',
  wallpaper: 'aurora',
  createdAt: null,
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readConfig() {
  ensureDataDir();
  if (!fs.existsSync(CONFIG_PATH)) {
    writeConfig(DEFAULT_CONFIG);
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch (err) {
    console.error('[config] falha ao ler config.json, usando padrão:', err.message);
    return { ...DEFAULT_CONFIG };
  }
}

function writeConfig(partial) {
  ensureDataDir();
  const current = fs.existsSync(CONFIG_PATH) ? readConfig() : DEFAULT_CONFIG;
  const merged = { ...current, ...partial };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}

module.exports = { readConfig, writeConfig, DATA_DIR, CONFIG_PATH };
