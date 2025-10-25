import express from 'express';
import morgan from 'morgan';
import fetch from 'node-fetch';
import { toReadarrAuthor, toReadarrBook, toReadarrBookDetail } from './mappers.js';

const PORT = parseInt(process.env.PORT || '8080', 10);
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();
const OL_PAGE_SIZE = Math.min(Math.max(parseInt(process.env.Ol_PAGE_SIZE || process.env.OL_PAGE_SIZE || '200', 10), 1), 500);
const ENABLE_CACHE = (process.env.ENABLE_CACHE || 'true').toLowerCase() === 'true';
const CACHE_TTL_MS = parseInt(process.env.CACHE_TTL_MS || '600000', 10);
const CACHE_MAX = parseInt(process.env.CACHE_MAX || '500', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const BASE_PATH = (process.env.BASE_PATH || '').replace(/\/$/, '');

// Simple TTL cache
class TTLCache {
  constructor(max = 500, ttl = 600000) {
    this.max = max; this.ttl = ttl; this.map = new Map();
  }
  _now(){return Date.now()}
  get(k){
    const v = this.map.get(k);
    if(!v) return;
    if(this._now()>v.exp){ this.map.delete(k); return; }
    this.map.delete(k); this.map.set(k,v); return v.value;
  }
  set(k,val){
    const exp=this._now()+this.ttl;
    if(this.map.has(k)) this.map.delete(k);
    this.map.set(k,{value:val,exp});
    if(this.map.size>this.max){ const fk=this.map.keys().next().value; this.map.delete(fk); }
  }
}
const cache = ENABLE_CACHE ? new TTLCache(CACHE_MAX, CACHE_TTL_MS) : null;

async function cachedJson(url){
  if(!ENABLE_CACHE){
    const r = await fetch(url); if(!r.ok) throw new Error(`OL error ${r.status}`); return r.json();
  }
  const hit = cache.get(url); if(hit) return hit;
  const r = await fetch(url); if(!r.ok) throw new Error(`OL error ${r.status}`);
  const data = await r.json(); cache.set(url,data); return data;
}

const app = express();
app.disable('x-powered-by');

// CORS for testing
app.use((req,res,next)=>{
  res.header('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.header('Access-Control-Allow-Methods','GET, OPTIONS');
  res.header('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.sendStatus(204);
  next();
});

app.use(morgan(LOG_LEVEL==='debug'?'dev':'tiny'));

const router = express.Router();

router.get('/health',(req,res)=>res.json({ok:true, provider:'openlibrary'}));

// Readarr-like endpoints
router.get('/api/v1/author/lookup', async (req,res)=>{
  const term = (req.query.term||req.query.query||'').trim();
  if(!term) return res.status(400).json({error:'Missing term'});
  try{
    const url = `https://openlibrary.org/search/authors.json?q=${encodeURIComponent(term)}`;
    const data = await cachedJson(url);
    const docs = data?.docs || [];
    const authors = docs.map(toReadarrAuthor);
    res.json(authors);
  }catch(e){ res.status(502).json({error:e.message}); }
});

router.get('/api/v1/author/:olid/books', async (req,res)=>{
  const { olid } = req.params;
  const limit = Math.min(parseInt(req.query.limit || OL_PAGE_SIZE,10), 500);
  try{
    const url = `https://openlibrary.org/authors/${encodeURIComponent(olid)}/works.json?limit=${limit}`;
    const data = await cachedJson(url);
    const entries = data?.entries || [];
    const works = entries.map(toReadarrBook(olid));
    res.json(works);
  }catch(e){ res.status(502).json({error:e.message}); }
});

router.get('/api/v1/book/:olwid', async (req,res)=>{
  const { olwid } = req.params;
  try{
    const workUrl = `https://openlibrary.org/works/${encodeURIComponent(olwid)}.json`;
    const work = await cachedJson(workUrl);
    const editionsUrl = `https://openlibrary.org/works/${encodeURIComponent(olwid)}/editions.json?limit=50`;
    const editions = await cachedJson(editionsUrl);
    const detail = toReadarrBookDetail(work, editions?.entries || []);
    res.json(detail);
  }catch(e){ res.status(502).json({error:e.message}); }
});

router.get('/cover/:cover',(req,res)=>{
  const u = `https://covers.openlibrary.org/b/olid/${encodeURIComponent(req.params.cover)}`;
  res.redirect(302,u);
});

app.use(BASE_PATH || '/', router);

app.listen(PORT, ()=>{
  console.log(`[readarr-ol] listening on :${PORT} base='${BASE_PATH||'/'}' cache=${ENABLE_CACHE?'on':'off'}`);
});
