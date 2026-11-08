import React from 'react';
import { Activity } from 'lucide-react';

const formatDate = (value) => {
  if (!value) return 'Date unavailable';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
};

export default function TransactionFeed({ transactions, cards }) {
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 12);

  return (
    <section className="glass-panel" style={{ padding: '18px 20px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} style={{ color: 'var(--primary)' }} /> Recent Transactions
        </h2>
        <span style={{ color: '#64748b', fontSize: '0.7rem' }}>Plaid feed</span>
      </div>
      <p style={{ color: '#64748b', fontSize: '0.74rem', margin: '0 0 12px' }}>
        Transactions appear after Plaid receives them from your bank. Updates are not guaranteed to be real time.
      </p>

      {recentTransactions.length === 0 ? (
        <div style={{ padding: '18px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', border: '1px dashed rgba(255,255,255,.1)', borderRadius: '10px' }}>
          {cards.some(card => card.plaidAccessToken) ? 'No transactions returned yet. Try Sync now again later.' : 'Link a card through Plaid to see transactions here.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {recentTransactions.map(transaction => {
            const card = cards.find(item => item.plaidAccountId === transaction.account_id);
            const amount = Number(transaction.amount || 0);
            return (
              <div key={transaction.transaction_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 2px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', color: '#e2e8f0', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {transaction.merchant_name || transaction.name || 'Card transaction'}
                    {transaction.pending && <span style={{ marginLeft: '6px', color: '#fbbf24', fontSize: '0.65rem' }}>Pending</span>}
                  </strong>
                  <span style={{ display: 'block', color: '#64748b', fontSize: '0.68rem', marginTop: '3px' }}>
                    {formatDate(transaction.date)} · {card ? `${card.bank} •••• ${card.last4}` : 'Linked account'}
                  </span>
                </div>
                <strong style={{ color: amount < 0 ? '#86efac' : '#e2e8f0', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  {amount < 0 ? '−' : ''}${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
