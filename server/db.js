import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'data', 'cardflow_db.json');
let pool = null;

function createPool() {
  if (!pool && process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'disable' ? false : { rejectUnauthorized: false }
    });
    pool.on('error', error => console.error('Unexpected PostgreSQL pool error:', error.message));
  }
  return pool;
}

function initFileDB() {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], sessions: {}, userData: {} }, null, 2), 'utf-8');
  }
}

function readFileDB() {
  initFileDB();
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (error) {
    console.error('Error reading local CardFlow data:', error.message);
    return { users: [], sessions: {}, userData: {} };
  }
}

function writeFileDB(data) {
  initFileDB();
  const temporaryFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(temporaryFile, DB_FILE);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, key] = stored.split(':');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return key === hash;
}

async function migrateLocalFileToPostgres(database) {
  if (!fs.existsSync(DB_FILE)) return;
  const marker = await database.query("SELECT value FROM cardflow_meta WHERE key = 'legacy_json_imported'");
  if (marker.rowCount) return;

  let legacy;
  try {
    legacy = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (error) {
    console.error('Could not parse legacy CardFlow JSON data for migration:', error.message);
    return;
  }

  if (!legacy || !Array.isArray(legacy.users)) return;

  const client = await database.connect();
  try {
    await client.query('BEGIN');
    for (const user of legacy.users) {
      await client.query(
        `INSERT INTO cardflow_users (id, name, email, password_hash, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [user.id, user.name, user.email, user.passwordHash, user.createdAt || new Date().toISOString()]
      );
    }
    for (const [token, userId] of Object.entries(legacy.sessions || {})) {
      await client.query(
        `INSERT INTO cardflow_sessions (token, user_id)
         SELECT $1, id FROM cardflow_users WHERE id = $2
         ON CONFLICT (token) DO NOTHING`,
        [token, userId]
      );
    }
    for (const [userId, data] of Object.entries(legacy.userData || {})) {
      await client.query(
        `INSERT INTO cardflow_user_data (user_id, data)
         SELECT id, $2::jsonb FROM cardflow_users WHERE id = $1
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, JSON.stringify(data || {})]
      );
    }
    await client.query(
      `INSERT INTO cardflow_meta (key, value) VALUES ('legacy_json_imported', $1::jsonb)
       ON CONFLICT (key) DO NOTHING`,
      [JSON.stringify({ importedAt: new Date().toISOString(), userCount: legacy.users.length })]
    );
    await client.query('COMMIT');
    console.log(`Imported ${legacy.users.length} CardFlow accounts from the legacy JSON database.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function initializeDatabase() {
  const database = createPool();
  if (!database) {
    initFileDB();
    console.warn('DATABASE_URL is not set; CardFlow is using local JSON storage. This is not durable on ephemeral hosts.');
    return;
  }

  await database.query(`
    CREATE TABLE IF NOT EXISTS cardflow_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS cardflow_sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES cardflow_users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS cardflow_user_data (
      user_id TEXT PRIMARY KEY REFERENCES cardflow_users(id) ON DELETE CASCADE,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS cardflow_meta (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL DEFAULT '{}'::jsonb
    );
  `);
  await migrateLocalFileToPostgres(database);
  console.log('CardFlow PostgreSQL storage is ready.');
}

export function getStorageMode() {
  return pool ? 'postgresql' : 'local-json';
}

function defaultUserData() {
  return {
    cards: [],
    transactions: [],
    checkingBalance: 0,
    currentDate: new Date().toISOString().split('T')[0],
    logs: []
  };
}

export async function registerUser(name, email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = {
    id: `usr_${crypto.randomUUID()}`,
    name: name.trim(),
    email: normalizedEmail,
    createdAt: new Date().toISOString()
  };
  const passwordHash = hashPassword(password);
  const token = `tok_${crypto.randomBytes(32).toString('hex')}`;
  const userData = {
    ...defaultUserData(),
    logs: [{ time: new Date().toLocaleTimeString(), type: 'info', msg: `Welcome to CardFlow, ${user.name}!` }]
  };

  if (pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'INSERT INTO cardflow_users (id, name, email, password_hash, created_at) VALUES ($1, $2, $3, $4, $5)',
        [user.id, user.name, user.email, passwordHash, user.createdAt]
      );
      await client.query('INSERT INTO cardflow_sessions (token, user_id) VALUES ($1, $2)', [token, user.id]);
      await client.query('INSERT INTO cardflow_user_data (user_id, data) VALUES ($1, $2::jsonb)', [user.id, JSON.stringify(userData)]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') throw new Error('An account with this email already exists.');
      throw error;
    } finally {
      client.release();
    }
  } else {
    const db = readFileDB();
    if (db.users.some(existing => existing.email.toLowerCase() === normalizedEmail)) {
      throw new Error('An account with this email already exists.');
    }
    db.users.push({ ...user, passwordHash });
    db.sessions[token] = user.id;
    db.userData[user.id] = userData;
    writeFileDB(db);
  }
  return { user, token };
}

export async function loginUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  let user;
  if (pool) {
    const result = await pool.query('SELECT * FROM cardflow_users WHERE email = $1', [normalizedEmail]);
    user = result.rows[0];
  } else {
    const db = readFileDB();
    user = db.users.find(existing => existing.email.toLowerCase() === normalizedEmail);
  }
  if (!user || !verifyPassword(password, user.passwordHash || user.password_hash)) {
    throw new Error('Invalid email or password.');
  }

  const token = `tok_${crypto.randomBytes(32).toString('hex')}`;
  if (pool) {
    await pool.query('INSERT INTO cardflow_sessions (token, user_id) VALUES ($1, $2)', [token, user.id]);
  } else {
    const db = readFileDB();
    db.sessions[token] = user.id;
    writeFileDB(db);
  }

  return {
    user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt || user.created_at },
    token
  };
}

export async function getUserByToken(token) {
  if (!token) return null;
  if (pool) {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.created_at FROM cardflow_sessions s
       JOIN cardflow_users u ON u.id = s.user_id WHERE s.token = $1`,
      [token]
    );
    const user = result.rows[0];
    return user ? { id: user.id, name: user.name, email: user.email, createdAt: user.created_at } : null;
  }

  const db = readFileDB();
  const userId = db.sessions[token];
  const user = db.users.find(existing => existing.id === userId);
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export async function logoutUser(token) {
  if (!token) return;
  if (pool) {
    await pool.query('DELETE FROM cardflow_sessions WHERE token = $1', [token]);
  } else {
    const db = readFileDB();
    delete db.sessions[token];
    writeFileDB(db);
  }
}

export async function getUserData(userId) {
  if (pool) {
    const result = await pool.query('SELECT data FROM cardflow_user_data WHERE user_id = $1', [userId]);
    return result.rows[0]?.data || defaultUserData();
  }
  const db = readFileDB();
  return db.userData[userId] || defaultUserData();
}

export async function getAllUsersWithData() {
  if (pool) {
    const result = await pool.query(
      `SELECT u.id, u.email, COALESCE(d.data, '{}'::jsonb) AS data
       FROM cardflow_users u LEFT JOIN cardflow_user_data d ON d.user_id = u.id`
    );
    return result.rows;
  }
  const db = readFileDB();
  return db.users.map(user => ({ id: user.id, email: user.email, data: db.userData[user.id] || {} }));
}

export async function saveUserData(userId, data) {
  if (pool) {
    const result = await pool.query(
      `INSERT INTO cardflow_user_data (user_id, data) VALUES ($1, $2::jsonb)
       ON CONFLICT (user_id) DO UPDATE
       SET data = cardflow_user_data.data || EXCLUDED.data, updated_at = NOW()
       RETURNING data`,
      [userId, JSON.stringify(data)]
    );
    return result.rows[0].data;
  }

  const db = readFileDB();
  db.userData[userId] = { ...(db.userData[userId] || {}), ...data };
  writeFileDB(db);
  return db.userData[userId];
}
