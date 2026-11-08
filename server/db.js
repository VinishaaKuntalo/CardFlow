import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'data', 'cardflow_db.json');

function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: [],
      sessions: {},
      userData: {}
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

function readDB() {
  initDB();
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading DB:', err);
    return { users: [], sessions: {}, userData: {} };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing DB:', err);
  }
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

export function registerUser(name, email, password) {
  const db = readDB();
  const normalizedEmail = email.trim().toLowerCase();

  const existing = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    throw new Error('An account with this email already exists.');
  }

  const userId = 'usr_' + crypto.randomUUID();
  const passwordHash = hashPassword(password);
  const newUser = {
    id: userId,
    name: name.trim(),
    email: normalizedEmail,
    createdAt: new Date().toISOString()
  };

  db.users.push({
    ...newUser,
    passwordHash
  });

  // Initialize individual user's data store
  db.userData[userId] = {
    cards: [],
    transactions: [],
    checkingBalance: 0,
    currentDate: new Date().toISOString().split('T')[0],
    logs: [
      { time: new Date().toLocaleTimeString(), type: 'info', msg: `Welcome to CardFlow, ${name}!` }
    ]
  };

  const token = 'tok_' + crypto.randomBytes(32).toString('hex');
  db.sessions[token] = userId;

  writeDB(db);

  return { user: newUser, token };
}

export function loginUser(email, password) {
  const db = readDB();
  const normalizedEmail = email.trim().toLowerCase();

  const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
  if (!user) {
    throw new Error('Invalid email or password.');
  }

  const valid = verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new Error('Invalid email or password.');
  }

  const token = 'tok_' + crypto.randomBytes(32).toString('hex');
  db.sessions[token] = user.id;
  writeDB(db);

  const { passwordHash, ...safeUser } = user;
  return { user: safeUser, token };
}

export function getUserByToken(token) {
  if (!token) return null;
  const db = readDB();
  const userId = db.sessions[token];
  if (!userId) return null;

  const user = db.users.find(u => u.id === userId);
  if (!user) return null;

  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export function logoutUser(token) {
  if (!token) return;
  const db = readDB();
  delete db.sessions[token];
  writeDB(db);
}

export function getUserData(userId) {
  const db = readDB();
  return db.userData[userId] || {
    cards: [],
    checkingBalance: 0,
    currentDate: new Date().toISOString().split('T')[0],
    logs: []
  };
}

export function saveUserData(userId, data) {
  const db = readDB();
  if (!db.userData[userId]) {
    db.userData[userId] = {};
  }
  db.userData[userId] = {
    ...db.userData[userId],
    ...data
  };
  writeDB(db);
  return db.userData[userId];
}
