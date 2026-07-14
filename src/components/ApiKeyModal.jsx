import React, { useState } from 'react';

export default function ApiKeyModal({ onSave }) {
  const [apiKey, setApiKey] = useState('');
  const hasEnvKey = !!import.meta.env.VITE_GEMINI_API_KEY;

  if (hasEnvKey) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="glass-panel" style={{ width: '450px', border: '1px solid var(--danger)', boxShadow: '0 0 20px rgba(255,51,102,0.3)' }}>
        <h2 style={{ marginBottom: '16px', color: 'var(--danger)' }}>Configuration Required</h2>
        <p style={{ color: 'white', marginBottom: '12px', fontSize: '14px' }}>
          No Gemini API key was found in the <code>.env</code> file.
        </p>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
          For this demo to work, please either add <code>VITE_GEMINI_API_KEY</code> to your <code>.env</code> file (recommended) OR temporarily paste it here to save in your browser.
        </p>
        <form onSubmit={(e) => { e.preventDefault(); onSave(apiKey); }}>
          <input 
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="AIzaSy..."
            required
            style={{
              width: '100%', padding: '12px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: 'white', marginBottom: '16px'
            }}
          />
          <button type="submit" className="btn-primary" style={{ width: '100%' }}>
            Save Key & Continue
          </button>
        </form>
      </div>
    </div>
  );
}
