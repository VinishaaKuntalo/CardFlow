import React, { useState } from 'react';
import { Mail, Clipboard, CheckCircle, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

export default function InboxSimulator({ cards, onImportBill, onAddLog }) {
  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox' | 'paste'
  const [pasteText, setPasteText] = useState('');
  const [parseResult, setParseResult] = useState(null);
  const [parseError, setParseError] = useState('');
  const [expandedMailId, setExpandedMailId] = useState(null);
  const [showMailboxSetup, setShowMailboxSetup] = useState(false);
  const [mailboxProvider, setMailboxProvider] = useState('');

  // The app has no email provider integration, so never present fabricated mail as a real inbox.
  const emails = [];

  const toggleMailExpand = (id) => {
    setExpandedMailId(expandedMailId === id ? null : id);
  };

  // Text Parser Logic (Simulates AI extraction of credit card details)
  const handleParseText = () => {
    setParseError('');
    setParseResult(null);

    if (!pasteText.trim()) {
      setParseError('Please paste some text first.');
      return;
    }

    // Try to extract card details using Regex patterns
    const text = pasteText.toLowerCase();
    
    // 1. Extract balance: looks for "$" followed by numbers/commas/decimals
    const balanceRegex = /\$([0-9,]+\.[0-9]{2})|balance:?\s*\$?([0-9,]+\.[0-9]{2})/i;
    const balanceMatch = pasteText.match(balanceRegex);
    let balanceVal = 0;
    if (balanceMatch) {
      const matchStr = balanceMatch[1] || balanceMatch[2];
      balanceVal = parseFloat(matchStr.replace(/,/g, ''));
    }

    // 2. Extract Last 4 Digits
    const last4Regex = /(?:ending in|card ending|account|last 4|ending|card\s*#)\s*[\*#\-]?\s*(\d{4})/i;
    const last4Match = pasteText.match(last4Regex);
    let last4Val = '';
    if (last4Match) {
      last4Val = last4Match[1];
    }

    // 3. Extract Due Date
    // Matches structures like "June 15, 2026" or "due: 06/15/2026" or "due date: June 15"
    const dateRegex = /(?:due date|payment due|due on|due|by)\s*(?:is|on|:)?\s*([a-zA-Z]{3,9}\s+\d{1,2}(?:\s*,\s*\d{4})?|\d{1,2}\/\d{1,2}\/\d{2,4})/i;
    const dateMatch = pasteText.match(dateRegex);
    let dueDateVal = '';
    if (dateMatch) {
      const matchedDateStr = dateMatch[1];
      const parsedDate = new Date(matchedDateStr);
      if (!isNaN(parsedDate.getTime())) {
        // Standardize to YYYY-MM-DD
        const year = parsedDate.getFullYear() || 2026;
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const day = String(parsedDate.getDate()).padStart(2, '0');
        dueDateVal = `${year}-${month}-${day}`;
      }
    }

    if (!last4Val) {
      setParseError('Could not locate a 4-digit card number (e.g. "ending in 4321"). Please include last 4 digits.');
      return;
    }

    // Match card
    const targetCard = cards.find(c => c.last4 === last4Val);
    if (!targetCard) {
      setParseError(`Found card ending in ${last4Val}, but no matching card is configured in CardFlow.`);
      return;
    }

    if (!balanceVal) {
      setParseError(`Found card ${targetCard.name}, but could not parse a statement balance (e.g. "$1,250.00").`);
      return;
    }

    if (!dueDateVal) {
      // Predict date if missing - say 21 days from today
      const future = new Date();
      future.setDate(future.getDate() + 21);
      dueDateVal = future.toISOString().split('T')[0];
    }

    setParseResult({
      cardId: targetCard.id,
      cardName: targetCard.name,
      bank: targetCard.bank,
      last4: last4Val,
      balance: balanceVal,
      dueDate: dueDateVal,
      minPayment: Math.max(35, Math.round(balanceVal * 0.03)) // Estimate minimum payment
    });
  };

  const handleApplyParsedResult = () => {
    if (!parseResult) return;
    
    onImportBill(parseResult.cardId, parseResult.balance, parseResult.dueDate, parseResult.minPayment);
    onAddLog(`Manually parsed & applied statement for ${parseResult.bank} (${parseResult.last4}). Balance: $${parseResult.balance}`, 'success');
    
    // Clear state
    setPasteText('');
    setParseResult(null);
  };

  return (
    <div className="glass-panel simulator-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Mail size={20} style={{ color: 'var(--color-info)' }} />
          Auto-Import Hub
        </h2>
        
        {/* Choose an email source or paste a statement */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(9, 13, 22, 0.4)', padding: '4px', borderRadius: '8px' }}>
          <button 
            className={`btn btn-ghost btn-sm ${activeTab === 'inbox' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('inbox')}
            style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
          >
            Email Inbox
          </button>
          <button 
            className={`btn btn-ghost btn-sm ${activeTab === 'paste' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('paste')}
            style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
          >
            Paste Statement
          </button>
        </div>
      </div>

      <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '-8px', marginBottom: '8px' }}>
        Email import is not connected yet. Paste statement text to import a bill.
      </p>

      {/* Tab Contents: Simulated Email Inbox */}
      {activeTab === 'inbox' && (
        <div className="inbox-list">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowMailboxSetup(value => !value)}
            style={{ marginBottom: '12px' }}
          >
            {showMailboxSetup ? 'Close mailbox setup' : '＋ Connect email'}
          </button>
          {showMailboxSetup && (
            <div style={{ padding: '14px', marginBottom: '12px', borderRadius: '10px', border: '1px solid rgba(99,102,241,.3)', background: 'rgba(99,102,241,.08)' }}>
              <strong style={{ color: '#e2e8f0', fontSize: '0.85rem' }}>Choose your email provider</strong>
              <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: '6px 0 10px' }}>
                Mailbox sign-in is not configured for this deployment yet. No email account is connected.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['Gmail', 'Outlook'].map(provider => (
                  <button key={provider} type="button" className="btn btn-ghost btn-sm" onClick={() => setMailboxProvider(provider)}>
                    {provider}
                  </button>
                ))}
              </div>
              {mailboxProvider && (
                <p role="status" style={{ color: '#cbd5e1', fontSize: '0.75rem', margin: '10px 0 0' }}>
                  {mailboxProvider} connection needs provider OAuth setup before sign-in can start.
                </p>
              )}
            </div>
          )}
          {emails.length === 0 ? (
            <div style={{ padding: '24px 16px', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>
              No mailbox connected. Connect email above or paste a statement to import a bill.
            </div>
          ) : emails.map(email => (
            <div 
              key={email.id} 
              className={`inbox-item ${email.unread ? 'unread' : ''}`}
              style={{ opacity: email.imported ? 0.6 : 1 }}
            >
              <div onClick={() => toggleMailExpand(email.id)}>
                <div className="inbox-item-header">
                  <span>{email.sender}</span>
                  <span>{email.date}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="inbox-item-title">{email.subject}</span>
                  {expandedMailId === email.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
                <div className="inbox-item-preview">
                  {email.body.substring(0, 80)}...
                </div>
              </div>

              {expandedMailId === email.id && (
                <div className="inbox-expanded-view">
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.75rem' }}>
                    {email.body}
                  </pre>
                  
                  <div className="inbox-import-actions">
                    {email.imported ? (
                      <span className="badge badge-paid" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={10} /> Imported
                      </span>
                    ) : (
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => handleImportMail(email)}
                        style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                      >
                        Auto-Import & Schedule
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab Contents: Text Parser Paste */}
      {activeTab === 'paste' && (
        <div className="parser-container">
          <textarea
            className="parser-textarea"
            placeholder="Paste text from a credit card statement or alert email... e.g. 'Your payment due for Capital One ending in 5432 is $350.00 on June 8th'"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          
          <button 
            className="btn btn-ghost btn-sm" 
            onClick={handleParseText}
            style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <Clipboard size={14} /> Scan Text for Details
          </button>

          {parseError && (
            <div style={{ display: 'flex', gap: '8px', color: '#f87171', fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.08)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{parseError}</span>
            </div>
          )}

          {parseResult && (
            <div style={{ 
              background: 'rgba(99, 102, 241, 0.08)', 
              border: '1px solid rgba(99, 102, 241, 0.25)', 
              borderRadius: '8px', 
              padding: '12px',
              animation: 'slideDown 0.3s ease-out'
            }}>
              <h4 style={{ fontSize: '0.85rem', color: '#a5b4fc', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle size={14} /> Scanner Results Detected:
              </h4>
              <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse', color: '#e2e8f0' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '4px 0', color: '#94a3b8' }}>Matched Card:</td>
                    <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 'bold' }}>{parseResult.cardName} (*{parseResult.last4})</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '4px 0', color: '#94a3b8' }}>Statement Balance:</td>
                    <td style={{ padding: '4px 0', textAlign: 'right', color: '#fff', fontWeight: 'bold' }}>${parseResult.balance.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', color: '#94a3b8' }}>Payment Due Date:</td>
                    <td style={{ padding: '4px 0', textAlign: 'right', color: '#fbbf24', fontWeight: 'bold' }}>
                      {new Date(parseResult.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button 
                  className="btn btn-success btn-sm"
                  onClick={handleApplyParsedResult}
                  style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                >
                  Confirm & Sync
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
