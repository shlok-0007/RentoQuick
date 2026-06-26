const { promises: fsp } = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// 4.7 — Refuse to start in production with file-DB
if (process.env.NODE_ENV === 'production' && !process.env.MONGO_URI) {
    console.error('FATAL: MONGO_URI is required in production - file-DB is dev-only');
    process.exit(1);
}

const DB_DIR = path.join(__dirname, '../../db');
const DB_FILE = path.join(DB_DIR, 'data.json');
if (!fsp.existsSync(DB_DIR)) fsp.mkdir(DB_DIR, { recursive: true });

const DEFAULT_DATA = { users: [], listings: [], bookings: [] };
const CACHE = new Map();
let CACHE_LOADED = false;

async function loadOnce() {
    if (CACHE_LOADED) return;
    try {
        const raw = await fsp.readFile(DB_FILE, 'utf-8');
        Object.assign(CACHE, JSON.parse(raw));
    } catch { Object.assign(CACHE, DEFAULT_DATA); }
    CACHE_LOADED = true;
}

async function readDB() { await loadOnce(); return CACHE; }

async function writeDB(data) {
    Object.assign(CACHE, data);
    await fsp.writeFile(DB_FILE, JSON.stringify(CACHE, null, 2));
}

function getCollection(name) { return CACHE[name] || []; }
function saveCollection(name, items) { CACHE[name] = items; writeDB(CACHE); }
function generateId() { return uuidv4(); }
function now() { return new Date().toISOString(); }
