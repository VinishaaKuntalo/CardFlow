import React, { useState, useEffect } from 'react';
import { 
  Plus, RefreshCw, AlertTriangle, ShieldAlert, CheckCircle, 
  Calendar, CreditCard as CardIcon, ArrowRight, Activity, Bell, Info,
  Download, Upload, LogOut, User
} from 'lucide-react';
import CreditCard from './components/CreditCard';
import Timeline from './components/Timeline';
import InboxSimulator from './components/InboxSimulator';
import CardModal from './components/CardModal';
import AuthPage from './components/AuthPage';
import { API_BASE } from './config';

// Helper to add days to a date string
const addDaysStr = (dateStr, days) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

// Default setup
const INITIAL_CARDS = [
  {
    id: 'card-chase',
    name: 'Sapphire Reserve',
    bank: 'Chase',
    last4: '9012',
    color: 'linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #0f172a 100%)',
    creditLimit: 15000,
    balance: 850.50,
    statementClosingDay: 15,
    gracePeriod: 25, // due on the 10th of next month
    nextStatementClose: '2026-06-15',
    nextDueDate: '2026-06-10',
    autoPayEnabled: true,
    autoPayOption: 'statement_balance',
    autoPayDaysBefore: 3, // Pay on June 7th
    autoPaySource: 'Primary Checking (*4321)',
    statementBalance: 1245.80, // previous closed cycle balance
    statementDueDate: '2026-06-10',
    statementStatus: 'unpaid', // unpaid, scheduled, paid
    minPaymentDue: 35.00
  },
  {
    id: 'card-amex',
    name: 'Gold Card',
    bank: 'Amex',
    last4: '1005',
    color: 'linear-gradient(135deg, #d97706 0%, #eab308 50%, #78350f 100%)',
    creditLimit: 20000,
    balance: 420.00,
    statementClosingDay: 18,
    gracePeriod: 25, // due on 13th of next month
    nextStatementClose: '2026-06-18',
    nextDueDate: '2026-06-13',
    autoPayEnabled: true,
    autoPayOption: 'statement_balance',
    autoPayDaysBefore: 2,
    autoPaySource: 'Primary Checking (*4321)',
    statementBalance: 685.20,
    statementDueDate: '2026-06-13',
    statementStatus: 'unpaid',
    minPaymentDue: 35.00
  },
  {
    id: 'card-capone',
    name: 'Venture One',
    bank: 'Capital One',
    last4: '5432',
    color: 'linear-gradient(135deg, #334155 0%, #475569 50%, #991b1b 100%)',
    creditLimit: 8000,
    balance: 2450.00,
    statementClosingDay: 10,
    gracePeriod: 25,
    nextStatementClose: '2026-06-10',
    nextDueDate: '2026-06-05',
    autoPayEnabled: false,
    autoPayOption: 'statement_balance',
    autoPayDaysBefore: 0,
    autoPaySource: 'None',
    statementBalance: 0,
    statementDueDate: '',
    statementStatus: 'paid',
    minPaymentDue: 0
  }
];

export default function App() {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('cardflow_auth_token') || '');
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('cardflow_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [cards, setCards] = useState(() => {
    const saved = localStorage.getItem('cardflow_cards');
    return saved ? JSON.parse(saved) : INITIAL_CARDS;
  });
  const [checkingBalance, setCheckingBalance] = useState(() => {
    const saved = localStorage.getItem('cardflow_checking');
    return saved ? parseFloat(saved) : 2500.00;
  });
  const [currentDate, setCurrentDate] = useState(() => {
    const saved = localStorage.getItem('cardflow_date');
    return saved ? saved : '2026-05-19';
  });
  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('cardflow_logs');
    return saved ? JSON.parse(saved) : [
      { time: '17:45:00', type: 'info', msg: 'CardFlow core initialized successfully.' },
      { time: '17:45:01', type: 'info', msg: 'Checking account buffer linked: $2,500.00 available.' },
    ];
  });
  const [toasts, setToasts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Fetch individual user data from backend on login or refresh
  const fetchUserData = async (token) => {
    try {
      const res = await fetch(`${API_BASE}/api/user/data`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.cards) setCards(data.cards);
        if (data.checkingBalance !== undefined) setCheckingBalance(data.checkingBalance);
        if (data.currentDate) setCurrentDate(data.currentDate);
        if (data.logs) setLogs(data.logs);
      }
    } catch (err) {
      console.warn('Could not sync user data from backend (offline or server restarting):', err);
    }
  };

  useEffect(() => {
    if (authToken) {
      fetchUserData(authToken);
    }
  }, [authToken]);

  // Handle Login / Sign Up
  const handleUserLogin = (userData, token) => {
    setCurrentUser(userData);
    setAuthToken(token);
    localStorage.setItem('cardflow_auth_token', token);
    localStorage.setItem('cardflow_user', JSON.stringify(userData));
    fetchUserData(token);
  };

  // Handle Log Out
  const handleUserLogout = () => {
    if (authToken) {
      fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      }).catch(() => {});
    }
    setCurrentUser(null);
    setAuthToken('');
    localStorage.removeItem('cardflow_auth_token');
    localStorage.removeItem('cardflow_user');
    localStorage.removeItem('cardflow_cards');
    localStorage.removeItem('cardflow_checking');
    localStorage.removeItem('cardflow_logs');
    setCards([]);
  };

  // Save changes locally and sync back to user account in database
  useEffect(() => {
    localStorage.setItem('cardflow_cards', JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    localStorage.setItem('cardflow_checking', checkingBalance.toString());
  }, [checkingBalance]);

  useEffect(() => {
    localStorage.setItem('cardflow_date', currentDate);
  }, [currentDate]);

  useEffect(() => {
    localStorage.setItem('cardflow_logs', JSON.stringify(logs));
  }, [logs]);

  // Sync state to backend when authenticated
  useEffect(() => {
    if (!authToken || !currentUser) return;
    const timer = setTimeout(() => {
      fetch(`${API_BASE}/api/user/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          cards,
          checkingBalance,
          currentDate,
          logs
        })
      }).catch(err => console.error('Failed to autosave user data:', err));
    }, 600);
    return () => clearTimeout(timer);
  }, [cards, checkingBalance, currentDate, logs, authToken, currentUser]);

  // Buffer Calculation: Find all unpaid statement balances due in the next 10 days
  const getBufferMetrics = () => {
    let upcomingTotal = 0;
    const currDateObj = new Date(currentDate);
    const tenDaysFromNow = new Date(currentDate);
    tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);

    cards.forEach(card => {
      if (card.statementBalance > 0 && card.statementStatus !== 'paid') {
        const dueDate = new Date(card.statementDueDate);
        if (dueDate >= currDateObj && dueDate <= tenDaysFromNow) {
          upcomingTotal += card.statementBalance;
        }
      }
    });

    const isSafe = checkingBalance >= upcomingTotal;
    const ratio = upcomingTotal > 0 ? checkingBalance / upcomingTotal : 10;
    
    let status = 'safe';
    if (upcomingTotal > 0 && ratio < 1.0) {
      status = 'danger'; // overdraft warning
    } else if (upcomingTotal > 0 && ratio < 1.5) {
      status = 'warning'; // low headroom warning
    }

    return {
      upcomingTotal,
      status,
      isSafe
    };
  };

  const bufferMetrics = getBufferMetrics();

  // Add a toast notification
  const addToast = (title, message, status = 'info') => {
    const id = Date.now() + Math.random().toString();
    setToasts(prev => [...prev, { id, title, message, status }]);
    setTimeout(() => {
      removeToast(id);
    }, 7000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Add system audit log
  const addLog = (msg, type = 'info') => {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [{ time: timeStr, type, msg }, ...prev.slice(0, 49)]);
  };

  // Pay statement manually or execute automatically
  const handlePayCard = (cardId, amountToPay = null) => {
    setCards(prev => prev.map(card => {
      if (card.id === cardId) {
        const payVal = amountToPay !== null ? amountToPay : card.statementBalance;
        
        // Deduct from checking balance
        setCheckingBalance(prevBal => {
          const newBal = prevBal - payVal;
          addLog(`Processed payment of $${payVal.toFixed(2)} to ${card.bank} ${card.name}. Checking balance: $${newBal.toFixed(2)}`, 'success');
          return newBal;
        });

        addToast(
          'Payment Success',
          `Successfully paid $${payVal.toFixed(2)} to ${card.bank} ${card.name}.`,
          'paid'
        );

        return {
          ...card,
          balance: Math.max(0, card.balance - payVal),
          statementBalance: 0,
          statementStatus: 'paid'
        };
      }
      return card;
    }));
  };

  // Sync bank accounts (simulated)
  const handleSyncCard = (cardId) => {
    addLog(`Syncing card data for ID ${cardId}...`, 'info');
    
    // Simulate updating card pending balance or statement close
    setCards(prev => prev.map(card => {
      if (card.id === cardId) {
        addToast(
          'Sync Complete',
          `Synced bank credentials for ${card.bank} card. Current balance is $${card.balance.toFixed(2)}.`,
          'info'
        );
        return card;
      }
      return card;
    }));
  };

  // Import bill from Inbox Simulator or parsed text
  const handleImportBill = (cardId, balanceAmount, dueDateStr, minPayAmount) => {
    setCards(prev => prev.map(card => {
      if (card.id === cardId) {
        return {
          ...card,
          statementBalance: balanceAmount,
          statementDueDate: dueDateStr,
          statementStatus: card.autoPayEnabled ? 'scheduled' : 'unpaid',
          minPaymentDue: minPayAmount,
          balance: card.balance + balanceAmount // sync total outstanding
        };
      }
      return card;
    }));

    const matched = cards.find(c => c.id === cardId);
    addToast(
      'New Bill Scheduled',
      `Auto-scheduled $${balanceAmount.toFixed(2)} for ${matched.bank} due on ${new Date(dueDateStr).toLocaleDateString()}.`,
      'info'
    );
  };

  // Edit / Save Card Settings (supports single card or an array of cards)
  const handleSaveCard = (cardDataOrArray) => {
    const cardList = Array.isArray(cardDataOrArray) ? cardDataOrArray : [cardDataOrArray];

    if (editingCard && !Array.isArray(cardDataOrArray)) {
      // Edit single card
      setCards(prev => prev.map(c => c.id === editingCard.id ? cardDataOrArray : c));
      addLog(`Updated card configuration for ${cardDataOrArray.bank} ${cardDataOrArray.name}.`, 'info');
      addToast('Card Saved', `Updated configuration for ${cardDataOrArray.name}.`, 'info');
    } else {
      // Create new cards
      const newCards = cardList.map(cardData => {
        let closeDate = new Date(currentDate);
        closeDate.setDate(cardData.statementClosingDay || 15);
        if (closeDate < new Date(currentDate)) {
          closeDate.setMonth(closeDate.getMonth() + 1);
        }
        const closeDateStr = closeDate.toISOString().split('T')[0];

        const dueDate = new Date(closeDate);
        dueDate.setDate(dueDate.getDate() + (cardData.gracePeriod || 21));
        const dueDateStr = dueDate.toISOString().split('T')[0];

        const hasBalance = (parseFloat(cardData.balance) || 0) > 0;
        const balVal = parseFloat(cardData.balance) || 0;

        return {
          ...cardData,
          id: cardData.id || `card-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          balance: balVal,
          creditLimit: parseFloat(cardData.creditLimit) || 5000,
          statementBalance: hasBalance ? balVal : 0,
          statementDueDate: hasBalance ? dueDateStr : '',
          statementStatus: hasBalance ? (cardData.autoPayEnabled ? 'scheduled' : 'unpaid') : 'paid',
          minPaymentDue: hasBalance ? Math.max(35, Math.round(balVal * 0.03)) : 0,
          nextStatementClose: closeDateStr,
          nextDueDate: dueDateStr
        };
      });

      setCards(prev => [...prev, ...newCards]);
      newCards.forEach(c => {
        addLog(`Linked new credit card: ${c.bank} ${c.name} ending in ${c.last4}`, 'success');
      });
      addToast('Cards Added', `Successfully linked ${newCards.length} card${newCards.length > 1 ? 's' : ''}!`, 'paid');
    }
    setIsModalOpen(false);
    setEditingCard(null);
  };

  // Export configurations to JSON file (Backup)
  const handleExportData = () => {
    const dataStr = JSON.stringify({
      cards,
      checkingBalance,
      currentDate,
      logs
    }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `cardflow_backup_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    addLog('Successfully exported configuration backup file.', 'success');
    addToast('Backup Exported', 'Downloaded backup JSON file.', 'paid');
  };

  // Import configurations from JSON file (Restore)
  const handleImportData = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileReader = new FileReader();
    fileReader.readAsText(files[0], "UTF-8");
    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed && Array.isArray(parsed.cards)) {
          setCards(parsed.cards);
          if (typeof parsed.checkingBalance === 'number') {
            setCheckingBalance(parsed.checkingBalance);
          }
          if (parsed.currentDate) {
            setCurrentDate(parsed.currentDate);
          }
          if (parsed.logs) {
            setLogs(parsed.logs);
          }
          addLog('Restored card configurations from backup.', 'success');
          addToast('Backup Restored', 'Successfully loaded configurations!', 'paid');
        } else {
          alert('Invalid backup file. Missing cards list.');
        }
      } catch (err) {
        alert('Failed to parse backup JSON file.');
      }
    };
  };

  // Delete Card
  const handleDeleteCard = (cardId) => {
    if (window.confirm('Are you sure you want to unlink this credit card?')) {
      setCards(prev => prev.filter(c => c.id !== cardId));
      addLog(`Unlinked credit card: ID ${cardId}`, 'warning');
      addToast('Card Removed', 'Credit card was unlinked successfully.', 'warning');
      setIsModalOpen(false);
      setEditingCard(null);
    }
  };

  // Clear All Data
  const handleClearAllData = () => {
    if (window.confirm('Wipe out all dummy/demo credit cards and start fresh? This lets you add your own actual accounts.')) {
      setCards([]);
      setCheckingBalance(0.00);
      setCurrentDate(new Date().toISOString().split('T')[0]); // Use actual current local date
      setLogs([
        { time: '00:00:00', type: 'info', msg: 'All data cleared. Ready for manual entry.' }
      ]);
      addToast('Data Wiped', 'All demo credit cards cleared. You can now add yours!', 'warning');
    }
  };

  // Reset to Demo Defaults
  const handleResetToDemo = () => {
    if (window.confirm('Reset CardFlow back to the standard sample cards and simulation settings?')) {
      localStorage.removeItem('cardflow_cards');
      localStorage.removeItem('cardflow_checking');
      localStorage.removeItem('cardflow_date');
      localStorage.removeItem('cardflow_logs');
      setCards(INITIAL_CARDS);
      setCheckingBalance(2500.00);
      setCurrentDate('2026-05-19');
      setLogs([
        { time: '17:45:00', type: 'info', msg: 'CardFlow core initialized successfully.' },
        { time: '17:45:01', type: 'info', msg: 'Checking account buffer linked: $2,500.00 available.' }
      ]);
      addToast('System Reset', 'Demo default settings loaded.', 'paid');
    }
  };

  // Trigger Sync for all accounts
  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    addLog('Initiating Plaid bank feed synchronization for all cards...', 'info');
    
    try {
      // Find all cards linked via real Plaid
      const realPlaidCards = cards.filter(card => card.plaidAccessToken);
      const syncedDataMap = {};

      // Fetch latest updates for each unique access token
      for (const card of realPlaidCards) {
        const token = card.plaidAccessToken;
        if (!syncedDataMap[token]) {
          try {
            const res = await fetch(`${API_BASE}/api/sync_accounts`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ access_token: token })
            });
            if (res.ok) {
              const data = await res.json();
              syncedDataMap[token] = data;
            }
          } catch (syncErr) {
            console.error(`Failed to sync token for ${card.bank}:`, syncErr);
          }
        }
      }

      setCards(prev => prev.map(card => {
        // If it is a real Plaid card and we have synced data for it
        if (card.plaidAccessToken && syncedDataMap[card.plaidAccessToken]) {
          const syncInfo = syncedDataMap[card.plaidAccessToken];
          const matchedAcc = syncInfo.accounts.find(a => a.id === card.plaidAccountId);
          if (matchedAcc) {
            addLog(`[PLAID SYNC] Successfully updated ${card.bank} ${card.name} balance to $${matchedAcc.balance} from live feed.`, 'info');
            return {
              ...card,
              balance: matchedAcc.balance,
              creditLimit: matchedAcc.limit || card.creditLimit
            };
          }
        }

        // Otherwise (or if fallback), run simulated cycle timing updates
        const closeDate = new Date(card.nextStatementClose);
        const currDate = new Date(currentDate);
        
        if (currDate >= closeDate && card.statementBalance === 0) {
          const generatedBalance = parseFloat((Math.random() * 800 + 200).toFixed(2));
          
          addLog(`[AUTO-SYNC] Detected closed billing cycle for ${card.bank} ${card.name}. Statement Balance: $${generatedBalance}`, 'warning');
          
          const nextClose = new Date(card.nextStatementClose);
          nextClose.setMonth(nextClose.getMonth() + 1);
          
          const nextDue = new Date(nextClose);
          nextDue.setDate(nextDue.getDate() - (card.gracePeriod || 25));

          return {
            ...card,
            statementBalance: generatedBalance,
            statementDueDate: card.nextStatementClose,
            statementStatus: card.autoPayEnabled ? 'scheduled' : 'unpaid',
            nextStatementClose: nextClose.toISOString().split('T')[0],
            balance: 0
          };
        }
        return card;
      }));

      addToast('Sync Success', 'Successfully synchronized balances for all linked banks.', 'paid');
    } catch (err) {
      console.error(err);
      addToast('Sync Error', 'Failed to synchronize Plaid bank feeds.', 'unpaid');
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Time Travel: Fast-forward time to simulate statement closings & automatic payments
  const handleTimeTravel = (daysToForward) => {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + daysToForward);
    const nextDateStr = nextDate.toISOString().split('T')[0];
    
    addLog(`Fast-forwarding system calendar by ${daysToForward} day(s) to ${nextDateStr}...`, 'info');
    
    // Check intermediate days for Autopay or Due Dates
    let tempDate = new Date(currentDate);
    const endDateTime = nextDate.getTime();
    
    // We will clone current cards and iterate day-by-day to simulate execution
    let currentCardsState = [...cards];
    let currentCheckingBalance = checkingBalance;

    while (tempDate.getTime() < endDateTime) {
      tempDate.setDate(tempDate.getDate() + 1);
      const stepDateStr = tempDate.toISOString().split('T')[0];
      const stepDateObj = new Date(stepDateStr);

      // 1. Process Statement Closings
      currentCardsState = currentCardsState.map(card => {
        const nextCloseDate = new Date(card.nextStatementClose);
        
        if (stepDateObj.getTime() === nextCloseDate.getTime() && card.statementBalance === 0) {
          // Statement closes!
          const balanceClosed = card.balance > 0 ? card.balance : parseFloat((Math.random() * 700 + 300).toFixed(2));
          const generatedDueDate = addDaysStr(stepDateStr, card.gracePeriod);
          
          // Calculate next cycle close (1 month ahead)
          const nextCloseObj = new Date(card.nextStatementClose);
          nextCloseObj.setMonth(nextCloseObj.getMonth() + 1);
          const nextCloseStr = nextCloseObj.toISOString().split('T')[0];

          addLog(`[SYSTEM] ${card.bank} billing cycle ended on ${stepDateStr}. Bill generated: $${balanceClosed.toFixed(2)} due on ${generatedDueDate}.`, 'warning');
          addToast(`Bill Generated`, `${card.bank} statement closed: $${balanceClosed.toFixed(2)} is due.`, 'warning');

          return {
            ...card,
            statementBalance: balanceClosed,
            statementDueDate: generatedDueDate,
            statementStatus: card.autoPayEnabled ? 'scheduled' : 'unpaid',
            nextStatementClose: nextCloseStr,
            balance: 0 // Reset new cycle balance
          };
        }
        return card;
      });

      // 2. Process Autopay Actions
      currentCardsState = currentCardsState.map(card => {
        if (card.autoPayEnabled && card.statementBalance > 0 && card.statementStatus !== 'paid') {
          // Calculate autopay date
          const dueDate = new Date(card.statementDueDate);
          const autopayDate = new Date(dueDate);
          autopayDate.setDate(autopayDate.getDate() - card.autoPayDaysBefore);
          
          const autopayDateStr = autopayDate.toISOString().split('T')[0];

          if (stepDateStr === autopayDateStr) {
            const chargeAmount = card.autoPayOption === 'statement_balance' ? card.statementBalance : card.minPaymentDue;
            
            if (currentCheckingBalance >= chargeAmount) {
              currentCheckingBalance -= chargeAmount;
              
              addLog(`[AUTOPAY] Triggered payment of $${chargeAmount.toFixed(2)} from ${card.autoPaySource} to ${card.bank} ${card.name}.`, 'success');
              addToast('Autopay Executed', `Paid $${chargeAmount.toFixed(2)} to ${card.name}.`, 'paid');
              
              return {
                ...card,
                statementBalance: 0,
                statementStatus: 'paid',
                balance: Math.max(0, card.balance - chargeAmount)
              };
            } else {
              // Insufficient funds! Failed autopay
              addLog(`[CRITICAL] Autopay FAILED for ${card.bank} ${card.name}: Insufficient funds in checking! Balance: $${currentCheckingBalance.toFixed(2)}, Bill: $${chargeAmount.toFixed(2)}`, 'danger');
              addToast('AUTOPAY FAILED', `Failed to pay ${card.name} due to insufficient funds!`, 'danger');
              
              return {
                ...card,
                statementStatus: 'unpaid' // turns red
              };
            }
          }
        }
        return card;
      });

      // 3. Process Due Dates (Check if any unpaid bills are missed)
      currentCardsState = currentCardsState.map(card => {
        if (card.statementBalance > 0 && card.statementStatus !== 'paid') {
          const dueDateStr = card.statementDueDate;
          if (stepDateStr === dueDateStr) {
            addLog(`[ALERT] Payment due date reached for ${card.bank} ${card.name}! Balance due: $${card.statementBalance.toFixed(2)}.`, 'danger');
            addToast('Missed Payment Alert', `Card ${card.name} is due today and unpaid!`, 'danger');
          }
        }
        return card;
      });
    }

    // Apply simulation updates
    setCards(currentCardsState);
    setCheckingBalance(currentCheckingBalance);
    setCurrentDate(nextDateStr);
  };

  // Helper to add mock funds to checking account
  const handleAddFunds = () => {
    setCheckingBalance(prev => {
      const newBal = prev + 1500;
      addLog(`Deposited paycheck buffer of $1,500.00. Checking balance: $${newBal.toFixed(2)}`, 'success');
      return newBal;
    });
    addToast('Funds Added', 'Deposited $1,500.00 into linked Checking Account.', 'paid');
  };

  if (!currentUser) {
    return <AuthPage onLogin={handleUserLogin} backendUrl={API_BASE} />;
  }

  return (
    <div className="app-container">
      {/* App Header */}
      <header className="app-header">
        <div className="logo-section">
          <div className="logo-icon">
            <CardIcon size={24} color="#fff" />
          </div>
          <div className="logo-text">
            <h1>CardFlow</h1>
            <p>Smart Autopay & Statement Hub</p>
          </div>
        </div>

        <div className="header-actions">
          {/* Time Machine Widget */}
          <div className="time-machine">
            <span>Simulated Date:</span>
            <strong>{new Date(currentDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</strong>
            <button 
              className="btn btn-ghost btn-sm"
              onClick={() => handleTimeTravel(1)}
              style={{ padding: '4px 8px', marginLeft: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              +1 Day
            </button>
            <button 
              className="btn btn-ghost btn-sm"
              onClick={() => handleTimeTravel(7)}
              style={{ padding: '4px 8px', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              +7 Days
            </button>
          </div>

          <button 
            className="btn btn-ghost btn-sm"
            onClick={handleResetToDemo}
            title="Load the standard demo set"
            style={{ fontSize: '0.75rem' }}
          >
            Load Demo
          </button>

          <button 
            className="btn btn-ghost btn-sm"
            onClick={handleClearAllData}
            title="Remove demo data to add your own card accounts"
            style={{ fontSize: '0.75rem', color: '#fca5a5' }}
          >
            Clear Data
          </button>

          <button 
            className="btn btn-primary"
            onClick={() => {
              setEditingCard(null);
              setIsModalOpen(true);
            }}
          >
            <Plus size={16} /> Link Card
          </button>

          {/* User Account & Logout */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 10px 4px 6px',
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.75rem',
              color: '#fff'
            }}>
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '120px' }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#fff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.1
              }}>
                {currentUser.name}
              </span>
              <span style={{
                fontSize: '0.65rem',
                color: '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.1
              }}>
                {currentUser.email}
              </span>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleUserLogout}
              title="Sign Out"
              style={{
                marginLeft: '4px',
                padding: '4px 6px',
                fontSize: '0.7rem',
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <LogOut size={13} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Checking Balance & Buffer Warning Banner */}
      <div className={`buffer-guard ${
        bufferMetrics.status === 'danger' ? 'bg-danger' : 
        bufferMetrics.status === 'warning' ? 'bg-warning' : 'bg-safe'
      }`}>
        <div className="buffer-guard-info">
          {bufferMetrics.status === 'danger' ? <ShieldAlert size={28} /> : 
           bufferMetrics.status === 'warning' ? <AlertTriangle size={28} /> : <CheckCircle size={28} />}
          
          <div className="buffer-guard-details">
            <h3>
              {bufferMetrics.status === 'danger' ? 'Overdraft Alert: Cash Deficit Detected' :
               bufferMetrics.status === 'warning' ? 'Low Capital Headroom: Pending Bills' :
               'Cash Buffer Secured'}
            </h3>
            <p>
              {bufferMetrics.status === 'danger' && `Upcoming bills due within 10 days total $${bufferMetrics.upcomingTotal.toFixed(2)}, which exceeds your Checking balance.`}
              {bufferMetrics.status === 'warning' && `You have $${bufferMetrics.upcomingTotal.toFixed(2)} due within 10 days. Liquid assets are tight.`}
              {bufferMetrics.status === 'safe' && (bufferMetrics.upcomingTotal > 0 ? 
                `All payments due in next 10 days ($${bufferMetrics.upcomingTotal.toFixed(2)}) are fully covered by checking balance.` :
                'No card bills are due in the next 10 days. Liquidity is safe.')}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', opacity: 0.7, textTransform: 'uppercase' }}>Available Checking</span>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', fontFamily: 'var(--font-display)' }}>
              ${checkingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleAddFunds} style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
            + Add $1,500
          </button>
        </div>
      </div>

      {/* Main Dashboard Layout Grid */}
      <main className="dashboard-grid">
        
        {/* Left Column: My Cards and Payment Timelines */}
        <div className="left-column">
          
          {/* Linked Cards Section */}
          <div className="glass-panel">
            <div className="section-header">
              <h2><CardIcon size={20} style={{ color: 'var(--primary)' }} /> Linked Credit Cards</h2>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={handleSyncAll}
                disabled={isSyncingAll}
              >
                <RefreshCw size={14} className={isSyncingAll ? 'sync-active' : ''} /> 
                {isSyncingAll ? 'Connecting feeds...' : 'Sync Feeds'}
              </button>
            </div>

            {cards.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '36px 20px',
                background: 'rgba(15, 23, 42, 0.4)',
                borderRadius: '16px',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
                margin: '12px 0'
              }}>
                <CardIcon size={36} style={{ color: '#64748b', margin: '0 auto 12px' }} />
                <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: '6px' }}>No Credit Cards Linked Yet</h4>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '16px', maxWidth: '340px', margin: '0 auto 16px' }}>
                  Link your cards using the Fast Link wizard or enter them manually to start tracking closing dates and payment timelines.
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => { setEditingCard(null); setIsModalOpen(true); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={16} /> Link Your First Card
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={handleResetToDemo}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                  >
                    Load Sample Cards
                  </button>
                </div>
              </div>
            ) : (
              <div className="cards-grid">
                {cards.map(card => (
                  <CreditCard 
                    key={card.id} 
                    card={card}
                    currentDate={currentDate}
                    onPay={handlePayCard}
                    onSync={handleSyncCard}
                    onEdit={(c) => {
                      setEditingCard(c);
                      setIsModalOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Chronological Payment Calendar/Timeline */}
          <Timeline 
            cards={cards} 
            currentDate={currentDate}
            onPay={handlePayCard}
          />
        </div>

        {/* Right Column: Statement Scanning Simulator & Audit Log */}
        <div className="right-column">
          
          {/* Automated Import Hub Panel */}
          <InboxSimulator 
            cards={cards} 
            onImportBill={handleImportBill}
            onAddLog={addLog}
          />

          {/* Device Sync & Backup Manager */}
          <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.05rem', margin: '0 0 10.5px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Download size={18} style={{ color: 'var(--primary)' }} />
              Device Backup & Sync
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '12px', lineHeight: '1.3' }}>
              Save your card configurations on this desktop to load them onto your mobile browser (or vice-versa).
            </p>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button 
                type="button" 
                className="btn btn-ghost btn-sm" 
                onClick={handleExportData} 
                style={{ flex: 1, background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.8rem', padding: '8px 12px' }}
              >
                <Download size={14} style={{ marginRight: '6px' }} /> Export
              </button>
              
              <label 
                className="btn btn-ghost btn-sm" 
                style={{ flex: 1, background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.8rem', padding: '8px 12px', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', margin: 0 }}
              >
                <Upload size={14} style={{ marginRight: '6px' }} /> Import
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleImportData} 
                  style={{ display: 'none' }} 
                />
              </label>
            </div>
          </div>

          {/* Audit System Log */}
          <div className="glass-panel log-panel">
            <div className="section-header" style={{ marginBottom: '12px' }}>
              <h2 style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={16} style={{ color: 'var(--primary)' }} />
                System Activity Log
              </h2>
            </div>
            
            <div className="log-list">
              {logs.map((log, i) => (
                <div key={i} className="log-entry">
                  <span className="log-time">[{log.time}]</span>
                  <span className={
                    log.type === 'success' ? 'log-msg-success' : 
                    log.type === 'warning' ? 'log-msg-warning' : 
                    log.type === 'danger' ? 'log-msg-danger' : ''
                  }>
                    {log.msg}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* Linked Card Creation/Edition Modal */}
      {isModalOpen && (
        <CardModal 
          card={editingCard}
          onClose={() => {
            setIsModalOpen(false);
            setEditingCard(null);
          }}
          onSave={handleSaveCard}
          onDelete={handleDeleteCard}
        />
      )}

      {/* Bottom Right Toast Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.status}`}>
            <div className="toast-content">
              <span className="toast-title">{toast.title}</span>
              <span className="toast-message">{toast.message}</span>
            </div>
            <button className="toast-close" onClick={() => removeToast(toast.id)}>
              &times;
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
