import React from 'react';
import { RefreshCw, CreditCard as CardIcon, ShieldAlert, CheckCircle, Settings, Calendar } from 'lucide-react';

export default function CreditCard({ card, onPay, onEdit, onSync, currentDate }) {
  const {
    id, name, bank, last4, color, creditLimit, balance,
    statementClosingDay, gracePeriod, nextStatementClose, nextDueDate,
    autoPayEnabled, autoPayOption, autoPayDaysBefore, autoPaySource,
    statementBalance, statementDueDate, statementStatus
  } = card;

  // Calculate utilization rate
  const hasCreditLimit = Number.isFinite(Number(creditLimit)) && Number(creditLimit) > 0;
  const utilization = hasCreditLimit ? Math.min(Math.round((Number(balance || 0) / Number(creditLimit)) * 100), 100) : null;
  
  // Get utilization bar color class
  const getUtilColorClass = (util) => {
    if (util < 30) return 'util-low';
    if (util < 50) return 'util-mid';
    return 'util-high';
  };

  // Format dates for display
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Check if payment is urgent (within 5 days and unpaid)
  const isUrgent = () => {
    if (!statementDueDate || statementStatus === 'paid') return false;
    const due = new Date(statementDueDate);
    const curr = new Date(currentDate);
    const diffTime = due - curr;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 5;
  };

  const isOverdue = () => {
    if (!statementDueDate || statementStatus === 'paid') return false;
    const due = new Date(statementDueDate);
    const curr = new Date(currentDate);
    return curr > due;
  };

  // Text for Autopay Option
  const getAutopayText = () => {
    if (!autoPayEnabled) return 'Off';
    const daysText = autoPayDaysBefore === 0 ? 'on due date' : `${autoPayDaysBefore} days prior`;
    const optionText = autoPayOption === 'statement_balance' ? 'Statement Bal' : 'Min Payment';
    return `${optionText} (${daysText})`;
  };

  return (
    <div className="card-container">
      {/* 3D Flipping Card */}
      <div className="credit-card-wrapper">
        <div className="credit-card-inner">
          
          {/* Card Front */}
          <div className="credit-card-front" style={{ '--card-gradient': color }}>
            <div className="card-header-row">
              <span className="bank-logo">{bank}</span>
              <span className="card-network">VISA</span>
            </div>
            
            <div className="chip-icon"></div>
            
            <div className="card-mid-row">
              <div className="card-number">•••• •••• •••• {last4}</div>
            </div>
            
            <div className="card-footer-row">
              <div>
                <div className="card-label-small">Card Holder</div>
                <div className="card-holder">{name}</div>
              </div>
              <div className="card-limit-status">
                <div className="card-label-small">Balance / Limit</div>
                <div className="card-balance-val">${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>

          {/* Card Back */}
          <div className="credit-card-back" style={{ '--card-gradient': color }}>
            <div className="card-magstripe"></div>
            <div className="card-back-info">
              <div className="card-signature-box">Authorized Signature</div>
              <div>CVV: •••</div>
            </div>
            <div className="card-rules-info">
              <div className="card-label-small" style={{ color: 'rgba(255,255,255,0.4)' }}>Autopay Rules</div>
              <div className="autopay-rule-badge">
                <CheckCircle size={10} color={autoPayEnabled ? '#a7f3d0' : '#94a3b8'} />
                <span>{autoPayEnabled ? `Active: ${getAutopayText()}` : 'Autopay Inactive'}</span>
              </div>
              <div className="card-label-small" style={{ color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>Funding Source</div>
              <div style={{ fontSize: '0.65rem' }}>{autoPayEnabled ? autoPaySource : 'None linked'}</div>
            </div>
          </div>

        </div>
      </div>

      {/* Card Stats & Control Panel Below */}
      <div className="card-details-panel">
        {/* Utilization progress bar */}
        <div>
          <div className="card-stats">
            <span>Utilization: {utilization === null ? '—' : `${utilization}%`}</span>
            <span>Limit: {hasCreditLimit ? `$${Number(creditLimit).toLocaleString()}` : 'Not provided'}</span>
          </div>
          <div className="card-utilization-bar">
            <div 
              className={`card-utilization-fill ${utilization === null ? '' : getUtilColorClass(utilization)}`}
              style={{ width: `${utilization ?? 0}%` }}
            ></div>
          </div>
        </div>

        {/* Dynamic Billing Status info */}
        <div className="card-date-row">
          <div className="card-date-item">
            <span className="card-date-label">Statement Close</span>
            <span className="card-date-value">{formatDate(nextStatementClose)}</span>
          </div>
          <div className="card-date-item" style={{ textAlign: 'right' }}>
            <span className="card-date-label">Payment Due</span>
            <span className={`card-date-value ${isOverdue() ? 'danger' : isUrgent() ? 'warning' : ''}`}>
              {statementDueDate ? formatDate(statementDueDate) : 'No Bill Yet'}
            </span>
          </div>
        </div>

        {card.plaidAccountId && (
          <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '8px' }}>
            Confirm the limit and payment due date with your bank. Plaid balance sync does not provide statement due dates.
          </div>
        )}

        {/* Statement Details Banner */}
        {statementBalance > 0 && (
          <div style={{
            fontSize: '0.8rem',
            padding: '8px 12px',
            borderRadius: '8px',
            background: statementStatus === 'paid' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
            border: `1px solid ${statementStatus === 'paid' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Statement Balance: </span>
              <strong style={{ color: '#fff' }}>${statementBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div>
              {statementStatus === 'paid' ? (
                <span className="badge badge-paid" style={{ fontSize: '0.65rem' }}>Paid</span>
              ) : statementStatus === 'scheduled' ? (
                <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>Scheduled</span>
              ) : (
                <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>Unpaid</span>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="card-actions-row">
          {statementBalance > 0 && statementStatus !== 'paid' && (
            <button 
              className="btn btn-success btn-sm" 
              onClick={() => onPay(id)}
              style={{ flex: 1 }}
            >
              Pay Now
            </button>
          )}
          <button 
            className="btn btn-ghost btn-sm" 
            onClick={() => onSync(id)}
            title="Manual Bank Sync"
            style={{ width: '36px', height: '36px', padding: 0, justifyContent: 'center' }}
          >
            <RefreshCw size={14} />
          </button>
          <button 
            className="btn btn-ghost btn-sm" 
            onClick={() => onEdit(card)}
            style={{ flex: 1 }}
          >
            <Settings size={14} /> Manage
          </button>
        </div>
      </div>
    </div>
  );
}
