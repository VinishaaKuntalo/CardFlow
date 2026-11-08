import React, { useState, useEffect } from 'react';
import { X, Check, Shield, Landmark, Loader2, Sparkles, Server, AlertTriangle } from 'lucide-react';
import { usePlaidLink } from 'react-plaid-link';
import { API_BASE } from '../config';


const GRADIENTS = [
  { name: 'Sapphire Blue', value: 'linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #0f172a 100%)' },
  { name: 'Gold Medal', value: 'linear-gradient(135deg, #d97706 0%, #eab308 50%, #78350f 100%)' },
  { name: 'Sleek Venture', value: 'linear-gradient(135deg, #334155 0%, #475569 50%, #991b1b 100%)' },
  { name: 'Double Cash', value: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 50%, #0f172a 100%)' },
  { name: 'Neon Rose', value: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' },
  { name: 'Emerald', value: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #022c22 100%)' }
];

const MOCK_PLAID_BANKS = [
  { id: 'chase', name: 'Chase Bank', color: '#115ec9', logo: '💳' },
  { id: 'amex', name: 'American Express', color: '#0070d2', logo: '✈️' },
  { id: 'rbc', name: 'RBC Royal Bank (Canada)', color: '#0051a5', logo: '🦁' },
  { id: 'td', name: 'TD Canada Trust', color: '#008a00', logo: '🌲' },
  { id: 'scotia', name: 'Scotiabank', color: '#ec111a', logo: '🔴' },
  { id: 'bmo', name: 'BMO Bank of Montreal', color: '#0079c1', logo: '🔵' },
  { id: 'cibc', name: 'CIBC', color: '#c41230', logo: '🍁' },
  { id: 'capone', name: 'Capital One', color: '#002e5f', logo: '🛡️' },
  { id: 'citi', name: 'Citi', color: '#00457c', logo: '🌐' },
  { id: 'apple', name: 'Apple Card / Goldman', color: '#000000', logo: '' }
];

const MOCK_PLAID_CARDS = {
  rbc: [
    {
      name: 'RBC Avion Visa Infinite',
      bank: 'RBC',
      creditLimit: 15000,
      balance: 620.00,
      statementClosingDay: 20,
      gracePeriod: 21,
      color: 'linear-gradient(135deg, #0051a5 0%, #003366 100%)',
      autoPayEnabled: true,
      autoPayOption: 'statement_balance',
      autoPayDaysBefore: 3,
      autoPaySource: 'RBC Day-to-Day Banking'
    },
    {
      name: 'RBC Cash Back Mastercard',
      bank: 'RBC',
      creditLimit: 7500,
      balance: 140.00,
      statementClosingDay: 12,
      gracePeriod: 21,
      color: 'linear-gradient(135deg, #0284c7 0%, #0f172a 100%)',
      autoPayEnabled: false,
      autoPayOption: 'statement_balance',
      autoPayDaysBefore: 0,
      autoPaySource: 'None'
    }
  ],
  td: [
    {
      name: 'TD Aeroplan Visa Infinite',
      bank: 'TD',
      creditLimit: 12500,
      balance: 850.00,
      statementClosingDay: 15,
      gracePeriod: 21,
      color: 'linear-gradient(135deg, #008a00 0%, #064e3b 100%)',
      autoPayEnabled: true,
      autoPayOption: 'statement_balance',
      autoPayDaysBefore: 3,
      autoPaySource: 'TD All-Inclusive Chequing'
    },
    {
      name: 'TD Cash Back Visa',
      bank: 'TD',
      creditLimit: 5000,
      balance: 95.00,
      statementClosingDay: 8,
      gracePeriod: 21,
      color: 'linear-gradient(135deg, #059669 0%, #0f172a 100%)',
      autoPayEnabled: true,
      autoPayOption: 'statement_balance',
      autoPayDaysBefore: 2,
      autoPaySource: 'TD Chequing'
    }
  ],
  scotia: [
    {
      name: 'Scotiabank Gold Amex',
      bank: 'Scotiabank',
      creditLimit: 16000,
      balance: 1120.00,
      statementClosingDay: 18,
      gracePeriod: 21,
      color: 'linear-gradient(135deg, #d97706 0%, #b45309 50%, #78350f 100%)',
      autoPayEnabled: true,
      autoPayOption: 'statement_balance',
      autoPayDaysBefore: 3,
      autoPaySource: 'Scotiabank Ultimate Chequing'
    },
    {
      name: 'Momentum Visa Infinite',
      bank: 'Scotiabank',
      creditLimit: 10000,
      balance: 310.00,
      statementClosingDay: 5,
      gracePeriod: 21,
      color: 'linear-gradient(135deg, #ec111a 0%, #991b1b 100%)',
      autoPayEnabled: true,
      autoPayOption: 'statement_balance',
      autoPayDaysBefore: 2,
      autoPaySource: 'Scotiabank Chequing'
    }
  ],
  bmo: [
    {
      name: 'BMO Eclipse Visa Infinite',
      bank: 'BMO',
      creditLimit: 14000,
      balance: 780.00,
      statementClosingDay: 22,
      gracePeriod: 21,
      color: 'linear-gradient(135deg, #0079c1 0%, #1e3a8a 100%)',
      autoPayEnabled: true,
      autoPayOption: 'statement_balance',
      autoPayDaysBefore: 3,
      autoPaySource: 'BMO Performance Chequing'
    }
  ],
  cibc: [
    {
      name: 'CIBC Dividend Visa Infinite',
      bank: 'CIBC',
      creditLimit: 12000,
      balance: 430.00,
      statementClosingDay: 14,
      gracePeriod: 21,
      color: 'linear-gradient(135deg, #c41230 0%, #881337 100%)',
      autoPayEnabled: true,
      autoPayOption: 'statement_balance',
      autoPayDaysBefore: 3,
      autoPaySource: 'CIBC Smart Account'
    }
  ],
  chase: [
    {
      name: 'Sapphire Preferred',
      bank: 'Chase',
      creditLimit: 12000,
      balance: 450.00,
      statementClosingDay: 15,
      gracePeriod: 25,
      color: 'linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #0f172a 100%)',
      autoPayEnabled: true,
      autoPayOption: 'statement_balance',
      autoPayDaysBefore: 3,
      autoPaySource: 'Checking Account (*4321)'
    },
    {
      name: 'Freedom Unlimited',
      bank: 'Chase',
      creditLimit: 8500,
      balance: 120.50,
      statementClosingDay: 5,
      gracePeriod: 25,
      color: 'linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)',
      autoPayEnabled: true,
      autoPayOption: 'statement_balance',
      autoPayDaysBefore: 3,
      autoPaySource: 'Checking Account (*4321)'
    }
  ],
  amex: [
    {
      name: 'Platinum Card',
      bank: 'Amex',
      creditLimit: 30000,
      balance: 1450.00,
      statementClosingDay: 20,
      gracePeriod: 25,
      color: 'linear-gradient(135deg, #475569 0%, #94a3b8 100%)',
      autoPayEnabled: true,
      autoPayOption: 'statement_balance',
      autoPayDaysBefore: 2,
      autoPaySource: 'Checking Account (*4321)'
    },
    {
      name: 'Gold Card',
      bank: 'Amex',
      creditLimit: 20000,
      balance: 620.00,
      statementClosingDay: 18,
      gracePeriod: 25,
      color: 'linear-gradient(135deg, #d97706 0%, #eab308 50%, #78350f 100%)',
      autoPayEnabled: true,
      autoPayOption: 'statement_balance',
      autoPayDaysBefore: 3,
      autoPaySource: 'Checking Account (*4321)'
    },
    {
      name: 'Cobalt Card (Amex)',
      bank: 'Amex',
      creditLimit: 12000,
      balance: 540.00,
      statementClosingDay: 14,
      gracePeriod: 21,
      color: 'linear-gradient(135deg, #2563eb 0%, #1e40af 50%, #0f172a 100%)',
      autoPayEnabled: true,
      autoPayOption: 'statement_balance',
      autoPayDaysBefore: 3,
      autoPaySource: 'Chequing Account (*4321)'
    },
    {
      name: 'SimplyCash Preferred',
      bank: 'Amex',
      creditLimit: 10000,
      balance: 290.00,
      statementClosingDay: 22,
      gracePeriod: 21,
      color: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
      autoPayEnabled: false,
      autoPayOption: 'statement_balance',
      autoPayDaysBefore: 0,
      autoPaySource: 'None'
    }
  ],
  capone: [
    {
      name: 'Venture X',
      bank: 'Capital One',
      creditLimit: 18000,
      balance: 2310.00,
      statementClosingDay: 10,
      gracePeriod: 25,
      color: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      autoPayEnabled: true,
      autoPayOption: 'statement_balance',
      autoPayDaysBefore: 3,
      autoPaySource: 'Checking Account (*4321)'
    }
  ],
  citi: [
    {
      name: 'Custom Cash',
      bank: 'Citi',
      creditLimit: 6000,
      balance: 380.00,
      statementClosingDay: 8,
      gracePeriod: 25,
      color: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)',
      autoPayEnabled: false,
      autoPayOption: 'statement_balance',
      autoPayDaysBefore: 0,
      autoPaySource: 'None'
    }
  ],
  apple: [
    {
      name: 'Apple Card',
      bank: 'Apple',
      creditLimit: 10000,
      balance: 85.00,
      statementClosingDay: 28,
      gracePeriod: 30, // due last day of next month
      color: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 70%, #cbd5e1 100%)',
      autoPayEnabled: true,
      autoPayOption: 'statement_balance',
      autoPayDaysBefore: 0,
      autoPaySource: 'Apple Cash Account'
    }
  ]
};

export default function CardModal({ card, onClose, onSave, onDelete }) {
  const [linkMode, setLinkMode] = useState('plaid'); // 'plaid' | 'manual'
  const [useRealPlaid, setUseRealPlaid] = useState(false);
  const [linkToken, setLinkToken] = useState(null);
  const [plaidAccessToken, setPlaidAccessToken] = useState('');
  const [plaidError, setPlaidError] = useState(null);
  const [plaidStep, setPlaidStep] = useState('select_bank'); // 'select_bank' | 'connecting' | 'select_cards' | 'launch_plaid'
  const [selectedBank, setSelectedBank] = useState(null);
  const [availableCards, setAvailableCards] = useState([]);
  const [selectedPlaidCards, setSelectedPlaidCards] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    bank: '',
    last4: '',
    creditLimit: 5000,
    balance: 0,
    statementClosingDay: 15,
    gracePeriod: 25,
    autoPayEnabled: false,
    autoPayOption: 'statement_balance',
    autoPayDaysBefore: 3,
    autoPaySource: 'Checking Account (*4321)',
    color: GRADIENTS[0].value
  });

  // If editing an existing card, skip bank connection and show manual editor
  useEffect(() => {
    if (card) {
      setFormData({ ...card });
      setLinkMode('manual');
    }
  }, [card]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSelectGradient = (gradientValue) => {
    setFormData(prev => ({
      ...prev,
      color: gradientValue
    }));
  };

  // Fetch Link Token from local backend when toggled or modal opens
  const fetchLinkToken = async () => {
    setPlaidError(null);
    setPlaidStep('connecting');
    try {
      const res = await fetch(`${API_BASE}/api/create_link_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        throw new Error(`Failed to create link token: ${res.statusText}`);
      }
      const data = await res.json();
      setLinkToken(data.link_token);
      setPlaidStep('launch_plaid');
    } catch (err) {
      console.error(err);
      setPlaidError('Could not reach CardFlow’s bank connection service. Please try again later.');
      setPlaidStep('select_bank');
    }
  };

  const { open: openPlaid, ready: plaidReady } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken, metadata) => {
      setPlaidStep('connecting');
      setPlaidError(null);
      try {
        // 1. Exchange public token
        const exchangeRes = await fetch(`${API_BASE}/api/exchange_public_token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_token: publicToken })
        });
        if (!exchangeRes.ok) throw new Error('Token exchange failed');
        const exchangeData = await exchangeRes.json();
        const accessToken = exchangeData.access_token;
        setPlaidAccessToken(accessToken);

        // 2. Fetch credit accounts using access token
        const syncRes = await fetch(`${API_BASE}/api/sync_accounts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: accessToken })
        });
        if (!syncRes.ok) throw new Error('Sync accounts failed');
        const syncData = await syncRes.json();

        // 3. Map real credit accounts to our schema with flexible detection
        const isCreditOrCard = (acc) => {
          const type = (acc.type || '').toLowerCase();
          const subtype = (acc.subtype || '').toLowerCase();
          const name = (acc.name || '').toLowerCase();
          const off = (acc.officialName || '').toLowerCase();
          return (
            type === 'credit' ||
            subtype.includes('credit') ||
            subtype.includes('card') ||
            name.includes('visa') ||
            name.includes('mastercard') ||
            name.includes('amex') ||
            name.includes('card') ||
            off.includes('visa') ||
            off.includes('mastercard') ||
            off.includes('amex') ||
            off.includes('card')
          );
        };

        const rawCards = (syncData.accounts || []).filter(isCreditOrCard);

        const cardsToSave = rawCards.map(acc => {
          const bankName = syncData.institution || 'Linked Bank';
          const bLower = bankName.toLowerCase();
          const color = bLower.includes('scotia')
            ? 'linear-gradient(135deg, #ec111a 0%, #991b1b 100%)'
            : bLower.includes('rbc')
            ? 'linear-gradient(135deg, #0051a5 0%, #003366 100%)'
            : bLower.includes('td')
            ? 'linear-gradient(135deg, #008a00 0%, #064e3b 100%)'
            : bLower.includes('bmo')
            ? 'linear-gradient(135deg, #0079c1 0%, #1e3a8a 100%)'
            : bLower.includes('cibc')
            ? 'linear-gradient(135deg, #c41230 0%, #881337 100%)'
            : bLower.includes('amex')
            ? 'linear-gradient(135deg, #d97706 0%, #78350f 100%)'
            : bLower.includes('chase')
            ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #0f172a 100%)'
            : 'linear-gradient(135deg, #334155 0%, #475569 50%, #1e293b 100%)';

          return {
            id: `plaid-${acc.id}`,
            name: acc.officialName || acc.name,
            bank: bankName,
            last4: acc.mask || 'XXXX',
            creditLimit: parseFloat(acc.limit) || 5000,
            balance: parseFloat(acc.balance) || 0,
            statementClosingDay: 15,
            gracePeriod: 21,
            autoPayEnabled: false,
            autoPayOption: 'statement_balance',
            autoPayDaysBefore: 3,
            autoPaySource: 'None',
            color,
            plaidAccessToken: accessToken,
            plaidAccountId: acc.id
          };
        });

        if (cardsToSave.length > 0) {
          setSelectedBank({ name: syncData.institution || 'your bank' });
          setAvailableCards(cardsToSave.map((c, index) => ({ ...c, tempId: c.plaidAccountId || `plaid-${index}` })));
          setSelectedPlaidCards(Object.fromEntries(cardsToSave.map(c => [c.plaidAccountId, true])));
          setPlaidStep('select_cards');
        } else {
          setPlaidError('No credit card accounts were available from this bank connection. Check that Plaid supports your bank and that you authorized card accounts.');
          setPlaidStep('select_bank');
        }
      } catch (err) {
        console.error(err);
        setPlaidError('Failed to retrieve account details after Plaid login.');
        setPlaidStep('select_bank');
      }
    },
    onExit: (err, metadata) => {
      console.warn('Plaid onExit event:', { err, metadata });
      if (err) {
        const msg = err.display_message || err.error_message || err.message || 'Plaid connection exited with error.';
        const code = err.error_code ? ` [${err.error_code}]` : '';
        setPlaidError(`${msg}${code}`);
      } else if (metadata?.status && metadata.status !== 'requires_credentials') {
        console.log('User exited Plaid Link at step:', metadata.status);
      }
      setPlaidStep('select_bank');
    }
  });

  // Automatically trigger open when token is ready and step is 'launch_plaid'
  useEffect(() => {
    if (plaidReady && linkToken && plaidStep === 'launch_plaid') {
      openPlaid();
    }
  }, [plaidReady, linkToken, plaidStep]);

  const handleSelectBank = (bank) => {
    setSelectedBank(bank);
    setPlaidStep('connecting');
    
    // Simulate Plaid Login establishing connection
    setTimeout(() => {
      // Find cards for bank
      const cards = MOCK_PLAID_CARDS[bank.id] || [];
      
      // Inject random last 4 digits for realistic display
      const processedCards = cards.map(c => ({
        ...c,
        last4: Math.floor(1000 + Math.random() * 9000).toString(),
        tempId: `${bank.id}-${Math.random()}`
      }));

      setAvailableCards(processedCards);
      
      // Select all by default
      const defaultSelected = {};
      processedCards.forEach(c => {
        defaultSelected[c.tempId] = true;
      });
      setSelectedPlaidCards(defaultSelected);

      setPlaidStep('select_cards');
    }, 1500);
  };

  const handleTogglePlaidCardSelection = (tempId) => {
    setSelectedPlaidCards(prev => ({
      ...prev,
      [tempId]: !prev[tempId]
    }));
  };

  const handleImportPlaidCards = () => {
    const cardsToImport = availableCards.filter(c => selectedPlaidCards[c.tempId]);
    
    if (cardsToImport.length === 0) {
      alert('Please select at least one card to link.');
      return;
    }

    const cleanCards = cardsToImport.map(c => {
      const { tempId, ...cardClean } = c;
      return cardClean;
    });

    onSave(cleanCards);
    onClose();
  };


  const handleSubmitManual = (e) => {
    e.preventDefault();
    
    // Quick validation
    if (!formData.name || !formData.bank || !formData.last4) {
      alert('Please fill out card name, bank, and last 4 digits.');
      return;
    }
    
    if (formData.last4.length !== 4 || isNaN(formData.last4)) {
      alert('Last 4 digits must be exactly 4 numbers.');
      return;
    }

    onSave({
      ...formData,
      creditLimit: parseFloat(formData.creditLimit) || 0,
      balance: parseFloat(formData.balance) || 0,
      statementClosingDay: parseInt(formData.statementClosingDay) || 1,
      gracePeriod: parseInt(formData.gracePeriod) || 21,
      autoPayDaysBefore: parseInt(formData.autoPayDaysBefore) || 0
    });
    
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content" style={{ maxWidth: linkMode === 'plaid' ? '550px' : '500px' }}>
        <div className="modal-header" style={{ marginBottom: '16px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {card ? 'Manage Credit Card' : (
              <>
                <Landmark size={20} style={{ color: 'var(--primary)' }} />
                Link Credit Card
              </>
            )}
          </h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tab selection for new cards */}
        {!card && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'rgba(9, 13, 22, 0.4)', padding: '4px', borderRadius: '8px' }}>
            <button
              type="button"
              className={`btn btn-ghost btn-sm ${linkMode === 'plaid' ? 'btn-primary' : ''}`}
              onClick={() => setLinkMode('plaid')}
              style={{ flex: 1, padding: '8px', fontSize: '0.8rem', borderRadius: '6px' }}
            >
              <Sparkles size={14} style={{ marginRight: '4px' }} />
              Fast Link with Bank Login (No Manual Typing)
            </button>
            <button
              type="button"
              className={`btn btn-ghost btn-sm ${linkMode === 'manual' ? 'btn-primary' : ''}`}
              onClick={() => setLinkMode('manual')}
              style={{ flex: 1, padding: '8px', fontSize: '0.8rem', borderRadius: '6px' }}
            >
              Enter Manually
            </button>
          </div>
        )}

        {/* PLAI LINK SIMULATOR */}
        {linkMode === 'plaid' && !card && (
          <div>
            {/* Real vs Sim Mode Selector */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Server size={14} /> Link Source:
              </span>
              <div style={{ display: 'flex', gap: '4px', background: 'rgba(0, 0, 0, 0.2)', padding: '2px', borderRadius: '6px' }}>
                <button
                  type="button"
                  onClick={() => { setUseRealPlaid(false); setPlaidStep('select_bank'); setPlaidError(null); }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.75rem',
                    borderRadius: '4px',
                    border: 'none',
                    background: !useRealPlaid ? 'var(--primary)' : 'transparent',
                    color: !useRealPlaid ? '#fff' : '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  Simulated
                </button>
                <button
                  type="button"
                  onClick={() => { setUseRealPlaid(true); setPlaidStep('select_bank'); setPlaidError(null); }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.75rem',
                    borderRadius: '4px',
                    border: 'none',
                    background: useRealPlaid ? 'var(--primary)' : 'transparent',
                    color: useRealPlaid ? '#fff' : '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  Real Plaid API
                </button>
              </div>
            </div>

            {plaidError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'start' }}>
                <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '0.75rem', color: '#fca5a5' }}>{plaidError}</span>
              </div>
            )}

            {plaidStep === 'select_bank' && (
              <div>
                {!useRealPlaid ? (
                  <>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Shield size={14} color="#34d399" />
                      Select your bank to connect and download your card parameters automatically.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                      {MOCK_PLAID_BANKS.map(bank => (
                        <button
                          key={bank.id}
                          type="button"
                          onClick={() => handleSelectBank(bank)}
                          style={{
                            padding: '16px',
                            background: 'rgba(30, 41, 59, 0.4)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '12px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            color: '#fff',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--primary)';
                            e.currentTarget.style.background = 'rgba(30, 41, 59, 0.6)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.background = 'rgba(30, 41, 59, 0.4)';
                          }}
                        >
                          <span style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: bank.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.1rem'
                          }}>
                            {bank.logo}
                          </span>
                          <div>
                            <strong style={{ display: 'block', fontSize: '0.85rem' }}>{bank.name}</strong>
                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Instant Feed Sync</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                    <Landmark size={48} color="var(--primary)" style={{ margin: '0 auto 16px', opacity: 0.8 }} />
                    <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: '8px' }}>Connect with Plaid Production</h4>
                    <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '20px', maxWidth: '360px', margin: '0 auto 20px' }}>
                      Log in to your bank securely using the official Plaid credential interface.
                    </p>
                    
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={fetchLinkToken}
                      style={{ width: '100%', padding: '12px' }}
                    >
                      Connect Real Bank Feed
                    </button>
                  </div>
                )}
              </div>
            )}

            {plaidStep === 'launch_plaid' && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Loader2 size={36} className="sync-active" style={{ color: 'var(--primary)', margin: '0 auto 16px' }} />
                <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '8px' }}>Plaid Ready</h4>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '20px' }}>
                  The Plaid connection portal is ready to launch.
                </p>
                <button type="button" className="btn btn-primary" onClick={openPlaid}>
                  Open Plaid Portal
                </button>
              </div>
            )}

            {plaidStep === 'connecting' && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Loader2 size={36} className="sync-active" style={{ color: 'var(--primary)', margin: '0 auto 16px' }} />
                <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '8px' }}>Connecting to bank...</h4>
                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Establishing secure encrypted connection & retrieving credit accounts...
                </p>
              </div>
            )}


            {plaidStep === 'select_cards' && (
              <div>
                <h4 style={{ fontSize: '0.9rem', color: '#a5b4fc', marginBottom: '12px' }}>
                  {availableCards.length} Card{availableCards.length > 1 ? 's' : ''} Found in your {selectedBank?.name} Feed:
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  {availableCards.map(c => (
                    <div 
                      key={c.tempId}
                      onClick={() => handleTogglePlaidCardSelection(c.tempId)}
                      style={{
                        padding: '12px 16px',
                        background: 'rgba(30, 41, 59, 0.4)',
                        border: selectedPlaidCards[c.tempId] ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input 
                          type="checkbox"
                          checked={!!selectedPlaidCards[c.tempId]}
                          onChange={() => {}} // handled by div click
                          style={{ width: '16px', height: '16px', pointerEvents: 'none' }}
                        />
                        <div>
                          <strong style={{ fontSize: '0.85rem', color: '#fff' }}>{c.name}</strong>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
                            Card ending in •••• {c.last4} | Limit: ${c.creditLimit.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Cycle Ends</span>
                        <strong style={{ display: 'block', fontSize: '0.8rem', color: '#f1f5f9' }}>Day {c.statementClosingDay}</strong>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setPlaidStep('select_bank')}>
                    Back
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleImportPlaidCards}>
                    Link Selected Account{availableCards.filter(c => selectedPlaidCards[c.tempId]).length > 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MANUAL FORM EDITOR (and edit screen) */}
        {linkMode === 'manual' && (
          <form onSubmit={handleSubmitManual}>
            {/* Card Name and Bank */}
            <div className="form-row">
              <div className="form-group">
                <label>Bank Name</label>
                <input 
                  type="text" 
                  name="bank" 
                  className="form-control" 
                  placeholder="e.g. Chase" 
                  value={formData.bank}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Card Product Name</label>
                <input 
                  type="text" 
                  name="name" 
                  className="form-control" 
                  placeholder="e.g. Sapphire Reserve" 
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Last 4 Digits & Gradient Selector */}
            <div className="form-row">
              <div className="form-group">
                <label>Last 4 Digits</label>
                <input 
                  type="text" 
                  name="last4" 
                  className="form-control" 
                  placeholder="e.g. 9012" 
                  maxLength="4"
                  value={formData.last4}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Credit Limit ($)</label>
                <input 
                  type="number" 
                  name="creditLimit" 
                  className="form-control" 
                  min="0"
                  value={formData.creditLimit}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Current Balance ($)</label>
                <input 
                  type="number" 
                  name="balance" 
                  className="form-control" 
                  min="0"
                  step="0.01"
                  value={formData.balance}
                  onChange={handleChange}
                  required
                />
              </div>
              
              {/* Design theme selector */}
              <div className="form-group">
                <label>Select Card Theme</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {GRADIENTS.map((grad, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectGradient(grad.value)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: grad.value,
                        border: formData.color === grad.value ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0
                      }}
                      title={grad.name}
                    >
                      {formData.color === grad.value && <Check size={12} color="#fff" style={{ margin: 'auto' }} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Statement and Grace Period */}
            <div className="form-row">
              <div className="form-group">
                <label>Statement Cycle Day</label>
                <select 
                  name="statementClosingDay" 
                  className="form-control" 
                  value={formData.statementClosingDay}
                  onChange={handleChange}
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>Day {day} of the month</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Grace Period (Days)</label>
                <select 
                  name="gracePeriod" 
                  className="form-control" 
                  value={formData.gracePeriod}
                  onChange={handleChange}
                >
                  <option value="21">21 Days (Standard)</option>
                  <option value="25">25 Days (Standard)</option>
                  <option value="28">28 Days</option>
                  <option value="30">30 Days</option>
                </select>
              </div>
            </div>

            {/* Autopay Management */}
            <div style={{
              marginTop: '16px',
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <input 
                  type="checkbox" 
                  id="autoPayEnabled" 
                  name="autoPayEnabled" 
                  checked={formData.autoPayEnabled}
                  onChange={handleChange}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="autoPayEnabled" style={{ fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}>
                  Enable Smart Autopay Guarantee
                </label>
              </div>

              {formData.autoPayEnabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'slideDown 0.2s ease-out' }}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Payment Source</label>
                      <input 
                        type="text" 
                        name="autoPaySource" 
                        className="form-control" 
                        value={formData.autoPaySource}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Autopay Options</label>
                      <select 
                        name="autoPayOption" 
                        className="form-control" 
                        value={formData.autoPayOption}
                        onChange={handleChange}
                      >
                        <option value="statement_balance">Full Statement Balance</option>
                        <option value="minimum_payment">Minimum Payment Due</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Pay days prior to Due Date</label>
                    <select 
                      name="autoPayDaysBefore" 
                      className="form-control" 
                      value={formData.autoPayDaysBefore}
                      onChange={handleChange}
                    >
                      <option value="0">0 days (Pay on Due Date)</option>
                      <option value="1">1 day prior</option>
                      <option value="2">2 days prior</option>
                      <option value="3">3 days prior (Recommended)</option>
                      <option value="5">5 days prior (Safe buffer)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Form Submit */}
            <div className="form-actions" style={{ justifyContent: card ? 'space-between' : 'flex-end', width: '100%' }}>
              {card && (
                <button 
                  type="button" 
                  className="btn" 
                  onClick={() => onDelete(card.id)}
                  style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.25)', color: '#fca5a5' }}
                >
                  Delete Card
                </button>
              )}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="btn btn-ghost" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {card ? 'Save Changes' : 'Link Card'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
