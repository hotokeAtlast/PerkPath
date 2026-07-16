import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Shield, Lock, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30000;

/**
 * PinGate component provides 6-digit PIN authentication for admin access.
 * Includes rate limiting, focus management, and accessible error states.
 */
export default function PinGate({ children }) {
  const { isAdmin, login } = useAuth();
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const inputRefs = useRef([]);
  const lockoutTimer = useRef(null);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    return () => {
      if (lockoutTimer.current) clearTimeout(lockoutTimer.current);
    };
  }, []);

  const handleLockout = useCallback(() => {
    setLocked(true);
    lockoutTimer.current = setTimeout(() => {
      setLocked(false);
      setAttempts(0);
    }, LOCKOUT_DURATION_MS);
  }, []);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    if (locked) return;

    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setError(false);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newPin.every(d => d !== '') && newPin.join('').length === 6) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (!login(newPin.join(''))) {
        setError(true);
        setPin(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();

        if (newAttempts >= MAX_PIN_ATTEMPTS) {
          handleLockout();
        }
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  if (isAdmin) return children;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-color)', padding: '20px'
    }}>
      <div className="glass-panel" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'rgba(204, 255, 0, 0.1)', border: '2px solid var(--primary-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
          }}>
            <Shield size={28} color="var(--primary-accent)" aria-hidden="true" />
          </div>
          <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Operations Access</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Enter 6-digit admin PIN</p>
        </div>

        <form onSubmit={(e) => e.preventDefault()} aria-label="PIN entry form">
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend className="sr-only">Admin PIN digits</legend>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
              {pin.map((digit, i) => (
                <input
                  key={i}
                  ref={el => inputRefs.current[i] = el}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  disabled={locked}
                  aria-label={`PIN digit ${i + 1} of 6`}
                  aria-invalid={error}
                  aria-describedby={error ? 'pin-error' : undefined}
                  aria-disabled={locked}
                  style={{
                    width: '48px', height: '56px', textAlign: 'center', fontSize: '24px',
                    fontWeight: 'bold', borderRadius: '12px',
                    border: `2px solid ${error ? 'var(--danger)' : locked ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'}`,
                    background: 'rgba(255,255,255,0.05)', color: locked ? 'var(--text-secondary)' : 'white',
                    outline: 'none', transition: 'border-color 0.2s',
                    opacity: locked ? 0.5 : 1, cursor: locked ? 'not-allowed' : 'text'
                  }}
                />
              ))}
            </div>
          </fieldset>
        </form>

        {error && (
          <div id="pin-error" role="alert" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--danger)', fontSize: '13px', marginBottom: '16px' }}>
            <AlertTriangle size={14} aria-hidden="true" />
            <span>Invalid PIN. {MAX_PIN_ATTEMPTS - attempts > 0 ? `${MAX_PIN_ATTEMPTS - attempts} attempts remaining.` : 'Account locked.'}</span>
          </div>
        )}

        {locked && (
          <div role="status" aria-live="polite" style={{ color: 'var(--warning)', fontSize: '13px', marginBottom: '16px' }}>
            Too many failed attempts. Please wait 30 seconds.
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '12px' }}>
          <Lock size={12} aria-hidden="true" />
          Session-only auth · No data stored
        </div>
      </div>
    </div>
  );
}
