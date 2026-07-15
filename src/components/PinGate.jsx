import React, { useState, useRef, useEffect } from 'react';
import { Shield, Lock, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function PinGate({ children }) {
  const { isAdmin, login } = useAuth();
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setError(false);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newPin.every(d => d !== '') && newPin.join('').length === 6) {
      if (!login(newPin.join(''))) {
        setError(true);
        setPin(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
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
            <Shield size={28} color="var(--primary-accent)" />
          </div>
          <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Operations Access</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Enter 6-digit admin PIN</p>
        </div>

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
              style={{
                width: '48px', height: '56px', textAlign: 'center', fontSize: '24px',
                fontWeight: 'bold', borderRadius: '12px', border: `2px solid ${error ? 'var(--danger)' : 'rgba(255,255,255,0.1)'}`,
                background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
          ))}
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--danger)', fontSize: '13px', marginBottom: '16px' }}>
            <AlertTriangle size={14} />
            Invalid PIN. Try again.
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '12px' }}>
          <Lock size={12} />
          Session-only auth · No data stored
        </div>
      </div>
    </div>
  );
}
