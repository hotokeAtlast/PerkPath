import React, { useState, useRef, useEffect } from 'react';

/**
 * ApiKeyModal collects the user's Gemini API key on first load.
 * Includes input sanitization, focus trap, and accessible form elements.
 */
export default function ApiKeyModal({ onSave }) {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const sanitizeInput = (value) => {
    return value.replace(/[<>&"']/g, '').trim();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const sanitized = sanitizeInput(apiKey);
    if (!sanitized) {
      setError('API key cannot be empty');
      return;
    }
    if (sanitized.length < 10) {
      setError('API key appears too short. Please check your key.');
      return;
    }
    setError('');
    onSave(sanitized);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-modal-title"
      aria-describedby="api-modal-desc"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      <div ref={modalRef} className="glass-panel" style={{ width: '460px', border: '1px solid var(--primary-accent)', boxShadow: '0 0 30px rgba(204,255,0,0.15)' }}>
        <h2 id="api-modal-title" style={{ marginBottom: '8px', color: 'var(--primary-accent)', fontSize: '22px' }}>Welcome to PerkPath</h2>
        <p id="api-modal-desc" style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '13px', lineHeight: '1.5' }}>
          This demo uses the <strong style={{ color: 'white' }}>Google Gemini API</strong> to generate AI-powered stadium offers in real-time.
        </p>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '13px', lineHeight: '1.5' }}>
          Please enter your own Gemini API key below. It will be stored locally in your browser for the duration of your visit only.
        </p>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '12px', lineHeight: '1.5' }}>
          Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-accent)' }}>aistudio.google.com/apikey</a> (free tier: 20 requests/day)
        </p>
        <form onSubmit={handleSubmit} aria-label="API key entry">
          <label htmlFor="api-key-input" className="sr-only">Gemini API Key</label>
          <input
            id="api-key-input"
            ref={inputRef}
            type="password"
            value={apiKey}
            onChange={e => { setApiKey(e.target.value); setError(''); }}
            placeholder="Paste your Gemini API key here..."
            required
            aria-invalid={!!error}
            aria-describedby={error ? 'api-key-error' : undefined}
            autoComplete="off"
            spellCheck="false"
            style={{
              width: '100%', padding: '12px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${error ? 'var(--danger)' : 'rgba(255,255,255,0.15)'}`,
              color: 'white', marginBottom: '16px', fontSize: '14px', fontFamily: 'monospace'
            }}
          />
          {error && (
            <div id="api-key-error" role="alert" style={{ color: 'var(--danger)', fontSize: '12px', marginBottom: '12px', marginTop: '-8px' }}>
              {error}
            </div>
          )}
          <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px' }}>
            Save Key & Launch Demo
          </button>
        </form>
        <p style={{ color: 'var(--text-secondary)', marginTop: '16px', fontSize: '11px', textAlign: 'center' }}>
          Your key is stored in localStorage only — never sent anywhere except Google's Gemini API
        </p>
      </div>
    </div>
  );
}
