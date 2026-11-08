import React, { useEffect, useState } from 'react';
import { MessageCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { API_BASE } from '../config';

export default function WhatsAppReminders({ settings, onSave }) {
  const [phoneNumber, setPhoneNumber] = useState(settings.phoneNumber || '');
  const [optedIn, setOptedIn] = useState(Boolean(settings.optedIn));
  const [status, setStatus] = useState({ apiConfigured: false, scheduledJobConfigured: false, webhookConfigured: false });
  const [saved, setSaved] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    setPhoneNumber(settings.phoneNumber || '');
    setOptedIn(Boolean(settings.optedIn));
  }, [settings]);

  useEffect(() => {
    fetch(`${API_BASE}/api/whatsapp/status`)
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Status unavailable')))
      .then(setStatus)
      .catch(() => setStatus({ apiConfigured: false, scheduledJobConfigured: false, webhookConfigured: false }));
  }, []);

  const handleSave = (event) => {
    event.preventDefault();
    const normalizedPhone = phoneNumber.replace(/[\s()-]/g, '');
    if (optedIn && !/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
      setValidationError('Enter a valid phone number with country code, such as +14165551234.');
      return;
    }
    setValidationError('');
    onSave({
      phoneNumber: normalizedPhone,
      optedIn,
      enabled: optedIn && Boolean(normalizedPhone),
      updatedAt: new Date().toISOString()
    });
    setPhoneNumber(normalizedPhone);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3500);
  };

  const deliveryReady = status.apiConfigured && status.scheduledJobConfigured && status.webhookConfigured;

  return (
    <section className="glass-panel" style={{ padding: '18px 20px', marginBottom: '16px' }}>
      <h2 style={{ fontSize: '1.05rem', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <MessageCircle size={18} style={{ color: '#22c55e' }} /> WhatsApp Due-Date Reminders
      </h2>
      <p style={{ color: '#94a3b8', fontSize: '0.76rem', margin: '0 0 12px' }}>
        Get reminders 3 days before, 1 day before, and on the due date. CardFlow sends only for saved bills with a balance due.
      </p>

      <form onSubmit={handleSave} style={{ display: 'grid', gap: '10px' }}>
        <label style={{ color: '#cbd5e1', fontSize: '0.75rem' }} htmlFor="whatsapp-phone">WhatsApp number in international format</label>
        <input
          id="whatsapp-phone"
          type="tel"
          value={phoneNumber}
          onChange={event => setPhoneNumber(event.target.value)}
          placeholder="+14165551234"
          autoComplete="tel"
          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.12)', background: 'rgba(9,13,22,.6)', color: '#fff' }}
        />
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#cbd5e1', fontSize: '0.75rem', lineHeight: 1.45 }}>
          <input type="checkbox" checked={optedIn} onChange={event => setOptedIn(event.target.checked)} style={{ marginTop: '2px' }} />
          I agree to receive CardFlow payment due-date reminders on WhatsApp. I can turn them off here at any time.
        </label>
        <button type="submit" className="btn btn-primary btn-sm" style={{ justifySelf: 'start' }}>
          {saved ? 'Preference saved' : 'Save WhatsApp preference'}
        </button>
        {validationError && <span role="alert" style={{ color: '#fca5a5', fontSize: '0.72rem' }}>{validationError}</span>}
      </form>

      <div role="status" style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', marginTop: '12px', color: deliveryReady ? '#86efac' : '#fbbf24', fontSize: '0.72rem', lineHeight: 1.4 }}>
        {deliveryReady ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
        <span>{deliveryReady
          ? (settings.enabled ? 'WhatsApp delivery is configured. Reminders require your explicit opt-in above.' : 'WhatsApp is configured. Save your number and opt in to enable reminders.')
          : 'Not connected yet. Meta WhatsApp Business credentials, an approved template, webhook, persistent storage, and a daily job must be configured before messages can be delivered.'}</span>
      </div>
    </section>
  );
}
