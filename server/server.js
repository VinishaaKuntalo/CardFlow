import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import {
  registerUser,
  loginUser,
  getUserByToken,
  logoutUser,
  getUserData,
  saveUserData,
  getAllUsersWithData,
  initializeDatabase,
  getStorageMode
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json({ verify: (req, res, buffer) => { req.rawBody = buffer; } }));

// In production (Render, Railway, Heroku), use process.env.PORT assigned by host.
// In local dev, avoid port 5000 which is reserved by macOS AirPlay Receiver.
const rawPort = process.env.PORT;
const PORT = (rawPort && rawPort != 5000 && rawPort != '5000') ? rawPort : 5001;

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', storage: getStorageMode() });
});

// Auth Middleware
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: missing token' });
  }
  const token = authHeader.split(' ')[1];
  getUserByToken(token)
    .then(user => {
      if (!user) return res.status(401).json({ error: 'Unauthorized: session expired or invalid' });
      req.user = user;
      req.token = token;
      next();
    })
    .catch(next);
};

// --- AUTH ENDPOINTS ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }
    const result = await registerUser(name, email, password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const result = await loginUser(email, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  try {
    await logoutUser(req.token);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Could not end session.' });
  }
});

// --- USER ISOLATED DATA ENDPOINTS ---
app.get('/api/user/data', requireAuth, async (req, res) => {
  try {
    res.json(await getUserData(req.user.id));
  } catch (error) {
    res.status(500).json({ error: 'Could not load account data.' });
  }
});

app.post('/api/user/data', requireAuth, async (req, res) => {
  try {
    res.json(await saveUserData(req.user.id, req.body));
  } catch (error) {
    res.status(500).json({ error: 'Could not save account data.' });
  }
});

const whatsappConfig = {
  accessToken: (process.env.WHATSAPP_ACCESS_TOKEN || '').trim(),
  phoneNumberId: (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim(),
  templateName: (process.env.WHATSAPP_TEMPLATE_NAME || '').trim(),
  templateLanguage: (process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en_US').trim(),
  graphVersion: (process.env.WHATSAPP_GRAPH_API_VERSION || '').trim(),
  cronSecret: (process.env.WHATSAPP_CRON_SECRET || '').trim(),
  webhookVerifyToken: (process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '').trim(),
  metaAppSecret: (process.env.META_APP_SECRET || '').trim()
};
const whatsappApiConfigured = Boolean(
  whatsappConfig.accessToken && whatsappConfig.phoneNumberId && whatsappConfig.templateName && whatsappConfig.graphVersion
);

app.get('/api/whatsapp/status', (req, res) => {
  res.json({
    apiConfigured: whatsappApiConfigured,
    scheduledJobConfigured: Boolean(whatsappConfig.cronSecret && process.env.WHATSAPP_REMINDER_JOB_ENABLED === 'true'),
    webhookConfigured: Boolean(whatsappConfig.webhookVerifyToken && whatsappConfig.metaAppSecret)
  });
});

app.get('/api/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const verifyToken = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (whatsappConfig.webhookVerifyToken && mode === 'subscribe' && verifyToken === whatsappConfig.webhookVerifyToken && challenge) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

app.post('/api/whatsapp/webhook', async (req, res) => {
  const signature = req.get('x-hub-signature-256') || '';
  const expected = `sha256=${crypto.createHmac('sha256', whatsappConfig.metaAppSecret).update(req.rawBody || '').digest('hex')}`;
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (!whatsappConfig.metaAppSecret || actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    return res.sendStatus(401);
  }

  const optOutWords = new Set(['stop', 'stop all', 'unsubscribe', 'cancel', 'end', 'quit']);
  const messages = (req.body.entry || []).flatMap(entry => entry.changes || [])
    .flatMap(change => change.value?.messages || []);
  const phoneNumbersToDisable = new Set(messages
    .filter(message => message.type === 'text' && optOutWords.has((message.text?.body || '').trim().toLowerCase()))
    .map(message => String(message.from || '').replace(/\D/g, ''))
    .filter(Boolean));

  if (phoneNumbersToDisable.size) {
    for (const user of await getAllUsersWithData()) {
      const currentPhone = String(user.data.whatsappReminders?.phoneNumber || '').replace(/\D/g, '');
      if (currentPhone && phoneNumbersToDisable.has(currentPhone)) {
        await saveUserData(user.id, {
          whatsappReminders: { ...user.data.whatsappReminders, enabled: false, optedIn: false }
        });
      }
    }
  }

  res.sendStatus(200);
});

const sendWhatsAppReminder = async ({ recipient, card, daysUntilDue }) => {
  const dueDate = new Date(`${card.statementDueDate}T00:00:00Z`).toLocaleDateString('en-CA', {
    timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric'
  });
  const timing = daysUntilDue === 0 ? 'today' : `in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`;
  const response = await fetch(`https://graph.facebook.com/${whatsappConfig.graphVersion}/${whatsappConfig.phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${whatsappConfig.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient.replace(/\D/g, ''),
      type: 'template',
      template: {
        name: whatsappConfig.templateName,
        language: { code: whatsappConfig.templateLanguage },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: card.name || card.bank || 'Credit card' },
            { type: 'text', text: `$${Number(card.statementBalance).toFixed(2)}` },
            { type: 'text', text: dueDate },
            { type: 'text', text: timing }
          ]
        }]
      }
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error?.message || `WhatsApp send failed (${response.status})`);
  return result;
};

// Called once daily by a configured external scheduler; protected by a shared secret.
app.post('/api/jobs/whatsapp-reminders', async (req, res) => {
  if (!whatsappConfig.cronSecret || req.get('authorization') !== `Bearer ${whatsappConfig.cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized reminder job.' });
  }
  if (!whatsappApiConfigured) {
    return res.status(503).json({ error: 'WhatsApp Cloud API is not configured.' });
  }

  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const reminderOffsets = [3, 1, 0];
  let sent = 0;
  let skipped = 0;
  const failures = [];

  for (const user of await getAllUsersWithData()) {
    const prefs = user.data.whatsappReminders || {};
    if (!prefs.enabled || !prefs.optedIn || !prefs.phoneNumber) continue;
    const sentKeys = new Set(user.data.whatsappReminderSent || []);
    let changed = false;

    for (const card of user.data.cards || []) {
      if (!card.statementDueDate || !(Number(card.statementBalance) > 0) || card.statementStatus === 'paid') continue;
      const dueDate = new Date(`${card.statementDueDate}T00:00:00Z`);
      const daysUntilDue = Math.round((Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()) - todayUtc) / 86400000);
      if (!reminderOffsets.includes(daysUntilDue)) continue;

      const key = `${card.id}:${card.statementDueDate}:${daysUntilDue}`;
      if (sentKeys.has(key)) { skipped += 1; continue; }
      try {
        await sendWhatsAppReminder({ recipient: prefs.phoneNumber, card, daysUntilDue });
        sentKeys.add(key);
        sent += 1;
        changed = true;
      } catch (error) {
        console.error(`WhatsApp reminder failed for user ${user.id}, card ${card.id}:`, error.message);
        failures.push({ userId: user.id, cardId: card.id, error: error.message });
      }
    }

    if (changed) await saveUserData(user.id, { whatsappReminderSent: [...sentKeys] });
  }

  res.json({ sent, skipped, failures });
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
        optional_products: ['liabilities'],
      });
      return res.json(response.data);
    } catch (prodErr) {
      if (prodErr.response?.data?.error_code === 'INVALID_PRODUCT') {
        console.warn('Retrying linkTokenCreate without explicit products...');
        const fallbackRes = await plaidClient.linkTokenCreate({ ...tokenParams, products: ['transactions'] });
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

// Update an existing Plaid Item to request consent for statement/liability data.
app.post('/api/create_liabilities_update_link_token', async (req, res) => {
  const { access_token } = req.body;
  if (!access_token) return res.status(400).json({ error: 'Missing access_token' });
  try {
    const response = await plaidClient.linkTokenCreate({
      client_id: clientId,
      secret,
      user: { client_user_id: 'cardflow_user_id' },
      client_name: 'CardFlow',
      country_codes: ['CA', 'US'],
      language: 'en',
      access_token,
      additional_consented_products: ['liabilities'],
    });
    res.json(response.data);
  } catch (error) {
    const details = error.response?.data || error.message;
    console.error('Could not create Plaid liabilities update link token:', details);
    res.status(500).json({ error: details });
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

    let liabilitiesAvailable = false;
    const liabilitiesByAccountId = new Map();
    try {
      const liabilitiesResponse = await plaidClient.liabilitiesGet({
        client_id: clientId,
        secret,
        access_token,
      });
      liabilitiesAvailable = true;
      for (const liability of liabilitiesResponse.data.liabilities?.credit || []) {
        if (liability.account_id) liabilitiesByAccountId.set(liability.account_id, liability);
      }
    } catch (liabilitiesError) {
      console.warn('Plaid liabilities are unavailable for this Item:', liabilitiesError.response?.data?.error_code || liabilitiesError.message);
    }

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
      liabilitiesAvailable,
      accounts: accounts.map(acc => {
        const liability = liabilitiesByAccountId.get(acc.account_id);
        return {
          id: acc.account_id,
          name: acc.name,
          officialName: acc.official_name || acc.name,
          type: acc.type,
          subtype: acc.subtype,
          mask: acc.mask,
          balance: acc.balances.current,
          limit: liability?.credit_limit ?? acc.balances.limit,
          liabilitiesAccountFound: Boolean(liability),
          nextPaymentDueDate: liability?.next_payment_due_date ?? null,
          lastStatementBalance: liability?.last_statement_balance ?? null,
          minimumPaymentAmount: liability?.minimum_payment_amount ?? null,
          lastStatementIssueDate: liability?.last_statement_issue_date ?? null,
        };
      })
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

await initializeDatabase();

app.listen(PORT, () => {
  console.log(`CardFlow Backend running on port ${PORT} in ${plaidEnv} mode`);
  console.log(`Plaid Client ID: ${clientId ? clientId.substring(0, 6) + '...' : 'NOT FOUND'}`);
  console.log(`Plaid Secret: ${secret ? '••••••••' + secret.substring(secret.length - 4) : 'NOT FOUND'}`);
});

export default app;
