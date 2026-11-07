import React, { useState } from 'react';
import { 
  ShieldCheck, Lock, Mail, User, ArrowRight, Sparkles, 
  CreditCard, CheckCircle2, AlertCircle, Loader2 
} from 'lucide-react';

export default function AuthPage({ onLogin, backendUrl = 'http://localhost:5001' }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [canOffline, setCanOffline] = useState(false);

  const handleOfflineLogin = () => {
    const localUser = {
      id: 'local_' + (email.replace(/[^a-zA-Z0-9]/g, '_') || 'user'),
      name: isSignUp ? (name || 'Local User') : (email.split('@')[0] || 'User'),
      email: email.trim() || 'user@cardflow.local',
      isOffline: true
    };
    onLogin(localUser, 'local_tok_' + Date.now());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCanOffline(false);

    if (isSignUp && !name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !password) {
      setError('Please provide both an email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login';
    const payload = isSignUp ? { name, email, password } : { email, password };

    try {
      const res = await fetch(`${backendUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please check your credentials.');
      }

      // Successful login/register
      onLogin(data.user, data.token);
    } catch (err) {
      console.error(err);
      if (err.message.includes('Failed to fetch') || err.name === 'TypeError') {
        setError('Cannot connect to backend server on port 5001. Run "node server.js" in your server terminal, or continue in browser mode below.');
        setCanOffline(true);
      } else {
        setError(err.message || 'Authentication error.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background glow effects */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '25%',
        width: '450px',
        height: '450px',
        background: 'radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
        borderRadius: '50%',
        filter: 'blur(60px)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '25%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
        borderRadius: '50%',
        filter: 'blur(60px)',
        pointerEvents: 'none'
      }} />

      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '36px',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(14, 165, 233, 0.08)',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Brand / Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)',
            border: '1px solid rgba(14, 165, 233, 0.3)',
            marginBottom: '16px',
            boxShadow: '0 0 20px rgba(14, 165, 233, 0.25)'
          }}>
            <CreditCard size={28} style={{ color: 'var(--primary, #0ea5e9)' }} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 6px 0', letterSpacing: '-0.02em', color: '#fff' }}>
            CardFlow
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>
            {isSignUp ? 'Create your private personal dashboard' : 'Sign in to access your card timeline'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '10px',
          padding: '4px',
          marginBottom: '24px',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setError(''); }}
            style={{
              flex: 1,
              padding: '8px 16px',
              borderRadius: '7px',
              border: 'none',
              background: !isSignUp ? 'rgba(14, 165, 233, 0.2)' : 'transparent',
              color: !isSignUp ? '#38bdf8' : '#94a3b8',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setError(''); }}
            style={{
              flex: 1,
              padding: '8px 16px',
              borderRadius: '7px',
              border: 'none',
              background: isSignUp ? 'rgba(14, 165, 233, 0.2)' : 'transparent',
              color: isSignUp ? '#38bdf8' : '#94a3b8',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
            padding: '12px 14px',
            marginBottom: '20px',
            fontSize: '0.85rem',
            color: '#fca5a5'
          }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: '10px', marginBottom: canOffline ? '10px' : '0' }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={{ lineHeight: 1.4 }}>{error}</span>
            </div>
            {canOffline && (
              <button
                type="button"
                onClick={handleOfflineLogin}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(14, 165, 233, 0.4)',
                  background: 'rgba(14, 165, 233, 0.15)',
                  color: '#38bdf8',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  marginTop: '6px'
                }}
              >
                <Sparkles size={14} />
                Continue in Browser Mode (Instant Access)
              </button>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  required={isSignUp}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    color: '#fff',
                    fontSize: '0.875rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#fff',
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#fff',
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 20px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.925rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="sync-active" />
                <span>{isSignUp ? 'Creating your account...' : 'Signing in...'}</span>
              </>
            ) : (
              <>
                <span>{isSignUp ? 'Create Private Account' : 'Sign In to CardFlow'}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Feature Security Badges */}
        <div style={{
          marginTop: '28px',
          paddingTop: '20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: '#64748b'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={14} style={{ color: '#10b981' }} />
            Isolated Data
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={14} style={{ color: '#0ea5e9' }} />
            Plaid Live Sync
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Lock size={14} style={{ color: '#a855f7' }} />
            Scrypt Hashed
          </span>
        </div>
      </div>
    </div>
  );
}
