import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import {
  registerUser,
  loginUser,
  getUserByToken,
  logoutUser,
  getUserData,
  saveUserData
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());

// In production (Render, Railway, Heroku), use process.env.PORT assigned by host.
// In local dev, avoid port 5000 which is reserved by macOS AirPlay Receiver.
const rawPort = process.env.PORT;
const PORT = (rawPort && rawPort != 5000 && rawPort != '5000') ? rawPort : 5001;

// Auth Middleware
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: missing token' });
  }
  const token = authHeader.split(' ')[1];
  const user = getUserByToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: session expired or invalid' });
  }
  req.user = user;
  req.token = token;
  next();
};

// --- AUTH ENDPOINTS ---
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }
    const result = registerUser(name, email, password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const result = loginUser(email, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  logoutUser(req.token);
  res.json({ success: true });
});

// --- USER ISOLATED DATA ENDPOINTS ---
app.get('/api/user/data', requireAuth, (req, res) => {
  const data = getUserData(req.user.id);
  res.json(data);
});

app.post('/api/user/data', requireAuth, (req, res) => {
  const updated = saveUserData(req.user.id, req.body);
  res.json(updated);
});

// Initialize Plaid Client
const plaidEnv = process.env.PLAID_ENV || 'production';
const clientId = (process.env.PLAID_CLIENT_ID || '').trim();
const secret = (process.env.PLAID_SECRET || '').trim();

const configuration = new Configuration({
  basePath: PlaidEnvironments[plaidEnv] || PlaidEnvironments.production,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': clientId,
      'PLAID-SECRET': secret,
      'Plaid-Version': '2020-09-14',
    },
  },
  apiKey: (header) => {
    if (header === 'PLAID-CLIENT-ID') return clientId;
    if (header === 'PLAID-SECRET') return secret;
    if (header === 'Plaid-Version') return '2020-09-14';
  }
});

const plaidClient = new PlaidApi(configuration);

// Endpoint to create a Link Token
app.post('/api/create_link_token', async (req, res) => {
  try {
    const tokenParams = {
      client_id: clientId,
      secret: secret,
      user: {
        client_user_id: 'cardflow_user_id',
      },
      client_name: 'CardFlow',
      country_codes: ['CA', 'US'],
      language: 'en',
    };

    console.log(`Creating Plaid Link Token with countries: ${tokenParams.country_codes.join(', ')}`);

    try {
      const response = await plaidClient.linkTokenCreate({
        ...tokenParams,
        products: ['transactions'],
      });
      return res.json(response.data);
    } catch (prodErr) {
      if (prodErr.response?.data?.error_code === 'INVALID_PRODUCT') {
        console.warn('Retrying linkTokenCreate without explicit products...');
        const fallbackRes = await plaidClient.linkTokenCreate(tokenParams);
        return res.json(fallbackRes.data);
      }
      throw prodErr;
    }
  } catch (error) {
    const errorDetails = error.response?.data || error.message;
    console.error('Error creating link token:', errorDetails);
    res.status(500).json({ error: errorDetails });
  }
});

// Endpoint to exchange Public Token
app.post('/api/exchange_public_token', async (req, res) => {
  const { public_token } = req.body;
  if (!public_token) {
    return res.status(400).json({ error: 'Missing public_token' });
  }

  console.log('Plaid API: Exchanging public token for access token...');
  try {
    const response = await plaidClient.itemPublicTokenExchange({
      client_id: clientId,
      secret: secret,
      public_token,
    });
    
    console.log('Plaid API: Token exchanged successfully. Item ID:', response.data.item_id);
    res.json({
      access_token: response.data.access_token,
      item_id: response.data.item_id,
    });
  } catch (error) {
    console.error('Error exchanging public token:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// Endpoint to fetch Accounts/Balances using an Access Token
app.post('/api/sync_accounts', async (req, res) => {
  const { access_token } = req.body;
  if (!access_token) {
    return res.status(400).json({ error: 'Missing access_token' });
  }

  console.log('Plaid API: Fetching accounts for access token...');
  try {
    // 1. Get account and balance information
    const accountsResponse = await plaidClient.accountsGet({
      client_id: clientId,
      secret: secret,
      access_token,
    });

    const accounts = accountsResponse.data.accounts;
    const item = accountsResponse.data.item;

    // 2. Fetch details about the institution (bank name)
    let institutionName = 'Linked Bank';
    if (item.institution_id) {
      try {
        const instResponse = await plaidClient.institutionsGetById({
          institution_id: item.institution_id,
          country_codes: ['CA', 'US'],
        });
        institutionName = instResponse.data.institution.name;
      } catch (instError) {
        console.warn('Could not fetch institution name, defaulting:', instError.message);
      }
    }

    console.log(`Plaid API: Found ${accounts.length} accounts at ${institutionName}.`);
    res.json({
      institution: institutionName,
      accounts: accounts.map(acc => ({
        id: acc.account_id,
        name: acc.name,
        officialName: acc.official_name || acc.name,
        type: acc.type,
        subtype: acc.subtype,
        mask: acc.mask,
        balance: acc.balances.current,
        limit: acc.balances.limit || 0,
      }))
    });
  } catch (error) {
    console.error('Error syncing accounts:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// Incremental transaction feed sync for a linked Plaid Item.
app.post('/api/sync_transactions', async (req, res) => {
  const { access_token, cursor } = req.body;
  if (!access_token) {
    return res.status(400).json({ error: 'Missing access_token' });
  }

  try {
    let nextCursor = cursor || undefined;
    let hasMore = true;
    const added = [];
    const modified = [];
    const removed = [];

    while (hasMore) {
      const params = { access_token };
      if (nextCursor) params.cursor = nextCursor;
      const response = await plaidClient.transactionsSync(params);
      added.push(...response.data.added);
      modified.push(...response.data.modified);
      removed.push(...response.data.removed);
      nextCursor = response.data.next_cursor;
      hasMore = response.data.has_more;
    }

    res.json({ added, modified, removed, cursor: nextCursor });
  } catch (error) {
    const details = error.response?.data || error.message;
    console.error('Error syncing Plaid transactions:', details);
    res.status(500).json({ error: details });
  }
});

// Serve frontend build in production (Render / Railway)
import fs from 'fs';
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    next();
  }
});

app.listen(PORT, () => {
  console.log(`CardFlow Backend running on port ${PORT} in ${plaidEnv} mode`);
  console.log(`Plaid Client ID: ${clientId ? clientId.substring(0, 6) + '...' : 'NOT FOUND'}`);
  console.log(`Plaid Secret: ${secret ? '••••••••' + secret.substring(secret.length - 4) : 'NOT FOUND'}`);
});

export default app;
