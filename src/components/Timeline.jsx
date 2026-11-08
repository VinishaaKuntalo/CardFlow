import React, { useEffect, useState } from 'react';
import { Calendar, AlertCircle, Clock, CheckCircle2, Filter, Bell } from 'lucide-react';

export default function Timeline({ cards, onPay, currentDate }) {
  const [filter, setFilter] = useState('pending'); // 'all' | 'pending' | 'paid'
  const [reminderDays, setReminderDays] = useState(() => Number(localStorage.getItem('cardflow_reminder_days') || 3));
  const [notificationPermission, setNotificationPermission] = useState(() => (
    'Notification' in window ? Notification.permission : 'unsupported'
  ));

  useEffect(() => {
    localStorage.setItem('cardflow_reminder_days', String(reminderDays));
  }, [reminderDays]);

  useEffect(() => {
    if (notificationPermission !== 'granted') return undefined;

    const checkDueDates = () => {
      const now = new Date();
      const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      const notified = JSON.parse(localStorage.getItem('cardflow_notified_due_dates') || '{}');

      cards.forEach(card => {
        if (!card.statementDueDate || !(card.statementBalance > 0) || card.statementStatus === 'paid') return;
        const due = new Date(`${card.statementDueDate}T00:00:00`);
        const daysUntilDue = Math.ceil((Date.UTC(due.getFullYear(), due.getMonth(), due.getDate()) - today) / 86400000);
        const reminderKey = `${card.id}:${card.statementDueDate}`;
        if (daysUntilDue >= 0 && daysUntilDue <= reminderDays && !notified[reminderKey]) {
          new Notification(`CardFlow: ${card.name} payment due`, {
            body: `$${Number(card.statementBalance).toFixed(2)} is due ${daysUntilDue === 0 ? 'today' : `in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`}.`,
            tag: reminderKey
          });
          notified[reminderKey] = new Date().toISOString();
        }
      });

      localStorage.setItem('cardflow_notified_due_dates', JSON.stringify(notified));
    };

    checkDueDates();
    const interval = window.setInterval(checkDueDates, 30 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [cards, reminderDays, notificationPermission]);

  const enableBrowserReminders = async () => {
    if (!('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }
    setNotificationPermission(await Notification.requestPermission());
  };

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
            amount: card.autoPayOption === 'statement_balance' ? card.statementBalance : (card.minPaymentDue || 35),
            status: card.statementStatus === 'scheduled' ? 'scheduled' : 'pending_autopay',
            label: `Auto-Pay Scheduled (${card.autoPaySource})`,
            autoPayDescription: card.autoPayOption === 'statement_balance' ? 'full balance' : 'minimum payment',
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
      // Keep the default view focused on money due or scheduled to be paid.
      return event.type !== 'close' && event.status !== 'paid';
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
          Payment Schedule
        </h2>
        
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(9, 13, 22, 0.4)', padding: '4px', borderRadius: '8px' }}>
          <button 
            className={`btn btn-ghost btn-sm ${filter === 'pending' ? 'btn-primary' : ''}`}
            onClick={() => setFilter('pending')}
            style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
          >
            Upcoming
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
            All events
          </button>
        </div>
      </div>

      <div style={{ margin: '12px 0', padding: '10px 12px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#cbd5e1', fontSize: '0.78rem' }}>
        CardFlow tracks due dates here. <strong style={{ color: '#fbbf24' }}>“Mark paid” only updates CardFlow</strong>; it does not send money to your bank or card issuer.
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '14px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.07)', border: '1px solid rgba(99, 102, 241, 0.18)' }}>
        <Bell size={16} style={{ color: 'var(--primary)' }} />
        <span style={{ color: '#cbd5e1', fontSize: '0.78rem' }}>Remind me</span>
        <select aria-label="Reminder lead time" value={reminderDays} onChange={e => setReminderDays(Number(e.target.value))} style={{ background: '#111827', color: '#e2e8f0', border: '1px solid rgba(255,255,255,.15)', borderRadius: '6px', padding: '5px 8px' }}>
          <option value={1}>1 day before</option>
          <option value={3}>3 days before</option>
          <option value={7}>7 days before</option>
        </select>
        {notificationPermission === 'granted' ? (
          <span role="status" style={{ color: '#86efac', fontSize: '0.75rem' }}>Browser reminders enabled while CardFlow is open</span>
        ) : notificationPermission === 'denied' ? (
          <span role="status" style={{ color: '#fca5a5', fontSize: '0.75rem' }}>Notifications are blocked in browser settings</span>
        ) : notificationPermission === 'unsupported' ? (
          <span role="status" style={{ color: '#fca5a5', fontSize: '0.75rem' }}>This browser does not support notifications</span>
        ) : (
          <button type="button" className="btn btn-primary btn-sm" onClick={enableBrowserReminders}>Enable browser reminders</button>
        )}
        <span style={{ color: '#64748b', fontSize: '0.72rem', flexBasis: '100%', marginLeft: '26px' }}>Due date reminders are checked while the app is open. Email and closed-app reminders are not configured.</span>
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
                  <div className="timeline-due-type">
                    {event.type === 'close' ? 'Statement closes' : event.type === 'autopay' ? `Autopay planned · ${event.autoPayDescription || ''}` : 'Payment due'}
                  </div>
                </div>

                {/* Amount block */}
                <div className="timeline-amount">
                  {event.amount > 0 ? (
                    <>
                      <span>${event.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      <p>{event.type === 'autopay' ? 'planned autopay' : 'statement balance due'}</p>
                    </>
                  ) : (
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Statement closes</span>
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
                      Mark paid
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
