import express from 'express';
import morgan from 'morgan';
import fetch from 'node-fetch';
import { mapAuthorResult, mapWorkSummary, mapWorkDetail } from './mappers.js';

// ------------------ Config via env vars (Unraid-friendly) ------------------
const PORT = parseInt(process.env.PORT || '8080', 10);
const OL_PAGE_SIZE = Math.min(Math.max(parseInt(process.env.OL_PAGE_SIZE || '200', 10), 1), 500);
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();
const ENABLE_CACHE = (process.env.ENABLE_CACHE || 'true').toLowerCase() === 'true';
const CACHE_TTL_MS = parseInt(process.env.CACHE_TTL_MS || '600000', 10); // 10m default
const CACHE_MAX = parseInt(process.env.CACHE_MAX || '500', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const BASE_PATH = (process.env.BASE_PATH || '').replace(/\/$/, '');

// ------------------ Simple in-memory cache with TTL ------------------
class TTLCache {
  constructor(max = 500, ttl = 600000) {
    this.max = max;
    this.ttl = ttl;
    this.map = new Map();
  }
  _now() { return Date.now(); }
  get(key) {
    const v = this.map.get(key);
    if (!v) return undefined;
    if (this._now() > v.exp) {
      this.map.delete(key);
      return undefined;
    }
    // refresh LRU order
    this.map.delete(key);
    this.map.set(key, v);
    return v.value;
  }
  set(key, value) {
    const exp = this._now() + this.ttl;
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { value, exp });
    if (this.map.size > this.max) {
      // evict oldest
      const firstKey = this.map.keys().next().value;
      this.map.delete(firstKey);
    }
  }
}

const cache = ENABLE_CACHE ? new TTLCache(CACHE_MAX, CACHE_TTL_MS) : null;

async function cachedJson(url) {
  if (!ENABLE_CACHE) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`OpenLibrary error ${r.status}`);
    return r.json();
  }
  const hit = cache.get(url);
  if (hit) return hit;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`OpenLibrary error ${r.status}`);
  const data = await r.json();
  cache.set(url, data);
  return data;
}

// ------------------ App ------------------
const app = express();
app.disable('x-powered-by');

// CORS (for testing or browser-based tooling)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(morgan(LOG_LEVEL === 'debug' ? 'dev' : 'tiny'));

const router = express.Router();

router.get('/health', (req, res) => res.json({ ok: true }));

// rreader-glassess compatible endpoints:
// 1) Search authors by name
//    GET /author?query=terry%20pratchett
router.get('/author', async (req, res) => {
  const q = (req.query.query || '').trim();
  if (!q) return res.status(400).json({ error: 'Missing query' });
  try {
    const url = `https://openlibrary.org/search/authors.json?q=${encodeURIComponent(q)}`;
    const data = await cachedJson(url);
    const authors = (data?.docs || []).map(mapAuthorResult);
    res.json({ authors });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// 2) List all works by author key (OLxxxxxA)
//    GET /author/:authorKey/works?limit=200
router.get('/author/:authorKey/works', async (req, res) => {
  const { authorKey } = req.params;
  const limit = Math.min(parseInt(req.query.limit || OL_PAGE_SIZE, 10), 500);
  try {
    const url = `https://openlibrary.org/authors/${encodeURIComponent(authorKey)}/works.json?limit=${limit}`;
    const data = await cachedJson(url);
    const works = (data?.entries || []).map(mapWorkSummary);
    res.json({ authorKey, works, total: data?.size ?? works.length });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// 3) Work detail by work key (OLxxxxxW)
//    GET /work/:workKey
router.get('/work/:workKey', async (req, res) => {
  const { workKey } = req.params;
  try {
    const workUrl = `https://openlibrary.org/works/${encodeURIComponent(workKey)}.json`;
    const work = await cachedJson(workUrl);

    const editionsUrl = `https://openlibrary.org/works/${encodeURIComponent(workKey)}/editions.json?limit=50`;
    const editions = await cachedJson(editionsUrl);

    const mapped = mapWorkDetail(work, editions?.entries || []);
    res.json(mapped);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// 4) Cover passthrough (optional helper)
//    GET /cover/:olid-L.jpg
router.get('/cover/:cover', (req, res) => {
  const u = `https://covers.openlibrary.org/b/olid/${encodeURIComponent(req.params.cover)}`;
  res.redirect(302, u);
});

// mount at BASE_PATH (empty or like '/books')
app.use(BASE_PATH || '/', router);

app.listen(PORT, () => {
  console.log(`[openlibrary-proxy] listening on :${PORT} base='${BASE_PATH || '/'}' cache=${ENABLE_CACHE ? 'on' : 'off'}`);
});
