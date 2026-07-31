// lib/casaosStore.js
//
// Sincroniza o catálogo público da CasaOS-AppStore (Apache-2.0, créditos à
// IceWhaleTech: https://github.com/IceWhaleTech/CasaOS-AppStore) pra dentro
// da Aether Store.
//
// Estratégia: baixar o repositório inteiro como .zip (1 request) em vez de
// bater na API do GitHub uma vez por app (são 300+ apps — estouraria o rate
// limit não-autenticado de 60 req/hora em segundos). Depois parseamos cada
// Apps/<nome>/docker-compose.yml localmente com js-yaml.
//
// O resultado fica cacheado em disco (data/casaos-catalog-cache.json) com
// timestamp. GET /api/apps sempre serve o cache (rápido); a sincronização
// roda em background no start do servidor e a cada 24h — padrão
// "stale-while-revalidate".

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const yaml = require('js-yaml');
const { DATA_DIR } = require('./config');

const REPO_ZIP_URL = 'https://github.com/IceWhaleTech/CasaOS-AppStore/archive/refs/heads/main.zip';
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/IceWhaleTech/CasaOS-AppStore@main/Apps';
const CACHE_PATH = path.join(DATA_DIR, 'casaos-catalog-cache.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

let syncInProgress = false;

function extractAppEntry(folderName, composeText) {
  let doc;
  try {
    doc = yaml.load(composeText);
  } catch {
    return null; // docker-compose.yml malformado ou não-YAML — pula o app
  }
  if (!doc || !doc.services) return null;

  const serviceNames = Object.keys(doc.services);
  if (serviceNames.length === 0) return null;

  // metadados globais do app costumam vir soltos no fim do arquivo (x-casaos
  // top-level) OU dentro do serviço principal — tentamos os dois lugares.
  const topMeta = doc['x-casaos'] || {};
  const mainServiceName = topMeta.main && doc.services[topMeta.main] ? topMeta.main : serviceNames[0];
  const mainService = doc.services[mainServiceName] || {};
  const serviceMeta = mainService['x-casaos'] || {};
  const meta = { ...serviceMeta, ...topMeta };

  const description =
    (meta.description && (meta.description.en_US || meta.description.en_us || Object.values(meta.description)[0])) || '';
  const title =
    (meta.title && (meta.title.en_US || meta.title.en_us || Object.values(meta.title)[0])) || folderName;

  return {
    id: `casaos-${folderName.toLowerCase()}`,
    name: title,
    desc: description.split('\n')[0].slice(0, 120),
    category: meta.category || 'Outros',
    author: meta.author || 'CasaOS Community',
    image: mainService.image || '',
    icon: meta.icon || `${CDN_BASE}/${folderName}/icon.png`,
    thumbnail: meta.thumbnail || `${CDN_BASE}/${folderName}/thumbnail.png`,
    source: 'casaos',
    sourceFolder: folderName,
  };
}

async function downloadAndParse() {
  const res = await fetch(REPO_ZIP_URL);
  if (!res.ok) throw new Error(`falha ao baixar catálogo do CasaOS: HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());

  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  // dentro do zip tudo fica sob um prefixo tipo "CasaOS-AppStore-main/Apps/<nome>/docker-compose.yml"
  const composeEntries = entries.filter((e) => /\/Apps\/[^/]+\/docker-compose\.ya?ml$/.test(e.entryName));

  const apps = [];
  for (const entry of composeEntries) {
    const match = entry.entryName.match(/\/Apps\/([^/]+)\/docker-compose\.ya?ml$/);
    if (!match) continue;
    const folderName = match[1];
    const composeText = entry.getData().toString('utf-8');
    const parsed = extractAppEntry(folderName, composeText);
    if (parsed) apps.push(parsed);
  }

  return apps;
}

function readCache() {
  if (!fs.existsSync(CACHE_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

function writeCache(apps) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const payload = { syncedAt: new Date().toISOString(), count: apps.length, apps };
  fs.writeFileSync(CACHE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
  return payload;
}

async function syncCasaOSCatalog() {
  if (syncInProgress) return readCache();
  syncInProgress = true;
  try {
    console.log('[aether-store] sincronizando catálogo do CasaOS...');
    const apps = await downloadAndParse();
    const payload = writeCache(apps);
    console.log(`[aether-store] catálogo sincronizado: ${apps.length} apps do CasaOS.`);
    return payload;
  } catch (err) {
    console.error('[aether-store] falha ao sincronizar catálogo do CasaOS:', err.message);
    return readCache();
  } finally {
    syncInProgress = false;
  }
}

// stale-while-revalidate: devolve o cache imediatamente e dispara um refresh
// em background se estiver velho (ou inexistente).
function getCasaOSCatalog() {
  const cache = readCache();
  const isStale = !cache || (Date.now() - new Date(cache.syncedAt).getTime()) > CACHE_TTL_MS;
  if (isStale) {
    syncCasaOSCatalog(); // fire-and-forget
  }
  return cache ? cache.apps : [];
}

module.exports = { syncCasaOSCatalog, getCasaOSCatalog, CACHE_PATH };
