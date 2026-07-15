import React, { useState } from 'react';

export default function ApiKeyModal({ onSave }) {
  const [apiKey, setApiKey] = useState('');

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="glass-panel" style={{ width: '460px', border: '1px solid var(--primary-accent)', boxShadow: '0 0 30px rgba(204,255,0,0.15)' }}>
        <h2 style={{ marginBottom: '8px', color: 'var(--primary-accent)', fontSize: '22px' }}>Welcome to PerkPath</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '13px', lineHeight: '1.5' }}>
          This demo uses the <strong style={{ color: 'white' }}>Google Gemini API</strong> to generate AI-powered stadium offers in real-time.
        </p>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '13px', lineHeight: '1.5' }}>
          Please enter your own Gemini API key below. It will be stored locally in your browser for the duration of your visit only.
        </p>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '12px', lineHeight: '1.5' }}>
          Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-accent)' }}>aistudio.google.com/apikey</a> (free tier: 20 requests/day)
        </p>
        <form onSubmit={(e) => { e.preventDefault(); onSave(apiKey); }}>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="Paste your Gemini API key here..."
            required
            style={{
              width: '100%', padding: '12px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
              color: 'white', marginBottom: '16px', fontSize: '14px', fontFamily: 'monospace'
            }}
          />
          <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px' }}>
            Save Key & Launch Demo
          </button>
        </form>
        <p style={{ color: 'var(--text-secondary)', marginTop: '16px', fontSize: '11px', textAlign: 'center' }}>
          🔒 Your key is stored in localStorage only — never sent anywhere except Google's Gemini API
        </p>
      </div>
    </div>
  );
}
