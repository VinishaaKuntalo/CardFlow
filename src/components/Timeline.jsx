import React, { useState } from 'react';
import { Calendar, AlertCircle, Clock, CheckCircle2, ChevronRight, Filter } from 'lucide-react';

export default function Timeline({ cards, onPay, currentDate }) {
  const [filter, setFilter] = useState('pending'); // 'all' | 'pending' | 'paid'

  // Extract and compute chronological events
  const getEvents = () => {
    const events = [];

    cards.forEach(card => {
      // 1. Due Date Event (if statement is generated/active)
      if (card.statementBalance > 0) {
        const dueDate = new Date(card.statementDueDate);
        
        let status = 'upcoming'; // default
        if (card.statementStatus === 'paid') {
          status = 'paid';
        } else {
          const curr = new Date(currentDate);
          if (curr > dueDate) {
            status = 'overdue';
          } else {
            status = 'unpaid';
          }
        }

        events.push({
          id: `${card.id}-due`,
          cardId: card.id,
          cardName: card.name,
          bank: card.bank,
          date: dueDate,
          type: 'due',
          amount: card.statementBalance,
          status: status,
          label: 'Payment Due Date',
          originalCard: card
        });

        // 2. Autopay Event (if enabled and not paid yet)
        if (card.autoPayEnabled && card.statementStatus !== 'paid') {
          const autopayDate = new Date(dueDate);
          autopayDate.setDate(autopayDate.getDate() - card.autoPayDaysBefore);

          events.push({
            id: `${card.id}-autopay`,
            cardId: card.id,
            cardName: card.name,
            bank: card.bank,
            date: autopayDate,
            type: 'autopay',
            amount: card.autoPayOption === 'statement_balance' ? card.statementBalance : 35, // mock min payment
            status: card.statementStatus === 'scheduled' ? 'scheduled' : 'pending_autopay',
            label: `Auto-Pay Scheduled (${card.autoPaySource})`,
            originalCard: card
          });
        }
      }

      // 3. Statement Close Event
      if (card.nextStatementClose) {
        const closeDate = new Date(card.nextStatementClose);
        events.push({
          id: `${card.id}-close`,
          cardId: card.id,
          cardName: card.name,
          bank: card.bank,
          date: closeDate,
          type: 'close',
          amount: 0,
          status: 'info',
          label: 'Statement Cycle Closing',
          originalCard: card
        });
      }
    });

    // Sort events chronologically
    return events.sort((a, b) => a.date - b.date);
  };

  const allEvents = getEvents();

  // Apply filters
  const filteredEvents = allEvents.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'pending') {
      // Show close events, unpaid due events, and autopay events
      return event.status !== 'paid';
    }
    if (filter === 'paid') {
      return event.status === 'paid';
    }
    return true;
  });

  const getStatusBadge = (event) => {
    switch (event.status) {
      case 'paid':
        return <span className="badge badge-paid"><CheckCircle2 size={12} /> Paid</span>;
      case 'overdue':
        return <span className="badge badge-danger"><AlertCircle size={12} /> Overdue</span>;
      case 'unpaid':
        return <span className="badge badge-warning"><Clock size={12} /> Unpaid</span>;
      case 'scheduled':
        return <span className="badge badge-info"><Clock size={12} /> Scheduled</span>;
      case 'pending_autopay':
        return <span className="badge badge-info">Auto-Trigger</span>;
      case 'info':
        return <span className="badge badge-info" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}>Cycle Close</span>;
      default:
        return null;
    }
  };

  const getEventIcon = (event) => {
    switch (event.type) {
      case 'due':
        return <Calendar size={18} className={event.status === 'overdue' ? 'text-red-400' : 'text-amber-400'} />;
      case 'autopay':
        return <Clock size={18} style={{ color: 'var(--primary)' }} />;
      case 'close':
        return <Filter size={18} style={{ color: '#94a3b8' }} />;
      default:
        return <Calendar size={18} />;
    }
  };

  return (
    <div className="glass-panel timeline-container">
      <div className="timeline-header">
        <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={20} style={{ color: 'var(--primary)' }} />
          Smart Payment Timeline
        </h2>
        
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(9, 13, 22, 0.4)', padding: '4px', borderRadius: '8px' }}>
          <button 
            className={`btn btn-ghost btn-sm ${filter === 'pending' ? 'btn-primary' : ''}`}
            onClick={() => setFilter('pending')}
            style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
          >
            Pending
          </button>
          <button 
            className={`btn btn-ghost btn-sm ${filter === 'paid' ? 'btn-primary' : ''}`}
            onClick={() => setFilter('paid')}
            style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
          >
            Paid
          </button>
          <button 
            className={`btn btn-ghost btn-sm ${filter === 'all' ? 'btn-primary' : ''}`}
            onClick={() => setFilter('all')}
            style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
          >
            All
          </button>
        </div>
      </div>

      <div className="timeline-items">
        {filteredEvents.length === 0 ? (
          <div className="empty-timeline">
            No events to show in this view.
          </div>
        ) : (
          filteredEvents.map(event => {
            const isEventOverdue = event.status === 'overdue';
            const isEventPaid = event.status === 'paid';
            const itemClass = isEventPaid ? 'paid' : isEventOverdue ? 'overdue' : 'upcoming';

            return (
              <div key={event.id} className={`timeline-item ${itemClass}`}>
                {/* Date block */}
                <div className="timeline-date-block">
                  <span className="timeline-month">
                    {event.date.toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                  <span className="timeline-day">
                    {event.date.getDate()}
                  </span>
                </div>

                {/* Info block */}
                <div className="timeline-info">
                  <div className="timeline-card-name">
                    {getEventIcon(event)}
                    <span>{event.cardName}</span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'normal' }}>
                      ({event.bank} •••• {event.originalCard.last4})
                    </span>
                  </div>
                  <div className="timeline-due-type">{event.label}</div>
                </div>

                {/* Amount block */}
                <div className="timeline-amount">
                  {event.amount > 0 ? (
                    <>
                      <span>${event.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      <p>{event.type === 'autopay' ? 'estimated' : 'statement bal'}</p>
                    </>
                  ) : (
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Cycle End</span>
                  )}
                </div>

                {/* Actions block */}
                <div className="timeline-actions">
                  {getStatusBadge(event)}
                  {event.type === 'due' && event.status !== 'paid' && (
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => onPay(event.cardId)}
                      style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                    >
                      Pay
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
