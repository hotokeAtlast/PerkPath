import React, { useState } from 'react';
import './index.css';
import { generateOffer } from './services/aiService';
import ApiKeyModal from './components/ApiKeyModal';
import AdminDashboard from './components/AdminDashboard';
import FanMobileView from './components/FanMobileView';

function App() {
  const [gates, setGates] = useState({
    'Gate A': { congestion: 15, vendorItem: 'Cold Drinks', surplus: true },
    'Gate B': { congestion: 30, vendorItem: 'Hot Dogs', surplus: false },
    'Gate C': { congestion: 90, vendorItem: 'Team Jerseys', surplus: false },
  });

  const [fanLanguage, setFanLanguage] = useState('English');
  const [targetGate, setTargetGate] = useState('Gate C');
  
  const [offer, setOffer] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastOfferData, setLastOfferData] = useState(null);
  
  const hasEnvKey = !!import.meta.env.VITE_GEMINI_API_KEY;
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [showConfigModal, setShowConfigModal] = useState(!hasEnvKey && !localStorage.getItem('gemini_api_key'));
  const [errorMsg, setErrorMsg] = useState('');

  const handleSaveApiKey = (key) => {
    localStorage.setItem('gemini_api_key', key);
    setApiKey(key);
    setShowConfigModal(false);
  };

  const handleClearKey = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey('');
    setShowConfigModal(true);
  };

  const toggleSurplus = (gateName) => {
    setGates(prev => ({
      ...prev,
      [gateName]: { ...prev[gateName], surplus: !prev[gateName].surplus }
    }));
  };

  const setCongestion = (gateName, level) => {
    setGates(prev => ({
      ...prev,
      [gateName]: { ...prev[gateName], congestion: level }
    }));
  };

  const handleAcceptSimulation = () => {
    setOffer(null);
    setCongestion(targetGate, Math.max(0, gates[targetGate].congestion - 20));
  };

  const handleTriggerAI = async () => {
    if (!hasEnvKey && !apiKey) {
      setShowConfigModal(true);
      return;
    }
    
    setIsGenerating(true);
    setErrorMsg('');
    
    try {
      const alternativeGates = Object.entries(gates).filter(([name, data]) => name !== targetGate && data.congestion < 50 && data.surplus);
      let optimalGate = 'Any uncongested gate';
      let optimalPerk = 'a surprise reward';
      
      if (alternativeGates.length > 0) {
        optimalGate = alternativeGates[0][0];
        optimalPerk = `50% off ${alternativeGates[0][1].vendorItem}`;
      } else {
        const lowCongestionGates = Object.entries(gates).filter(([name, data]) => name !== targetGate && data.congestion < 50);
        if (lowCongestionGates.length > 0) {
          optimalGate = lowCongestionGates[0][0];
        }
      }

      const offerData = { targetGate, optimalGate, optimalPerk, fanLanguage };
      setLastOfferData(offerData);

      const generatedText = await generateOffer(
        apiKey,
        targetGate,
        optimalGate,
        optimalPerk,
        fanLanguage
      );

      setOffer(generatedText);
    } catch (error) {
      console.error(error);
      if (error.message === 'API_KEY_MISSING') {
        setShowConfigModal(true);
      } else {
        setErrorMsg('AI Generation Failed. Please check your API key or network connection.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="app-container">
      {showConfigModal && <ApiKeyModal onSave={handleSaveApiKey} />}

      {/* Global Error Toast */}
      {errorMsg && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--danger)', color: 'white', padding: '12px 24px',
          borderRadius: '8px', zIndex: 9999, fontWeight: 'bold', boxShadow: '0 4px 12px rgba(255,51,102,0.5)'
        }}>
          {errorMsg}
          <button onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', color: 'white', marginLeft: '16px', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Security clear key utility */}
      {!hasEnvKey && apiKey && (
        <button 
          onClick={handleClearKey}
          style={{
            position: 'absolute', bottom: '20px', left: '20px', zIndex: 100,
            background: 'rgba(255,51,102,0.1)', color: 'var(--danger)', border: '1px solid var(--danger)',
            padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px'
          }}
        >
          Logout / Clear API Key
        </button>
      )}

      <AdminDashboard 
        gates={gates}
        targetGate={targetGate}
        setTargetGate={setTargetGate}
        setCongestion={setCongestion}
        toggleSurplus={toggleSurplus}
        triggerAI={handleTriggerAI}
        isGenerating={isGenerating}
        offer={offer}
        lastOfferData={lastOfferData}
      />

      <FanMobileView 
        fanLanguage={fanLanguage}
        setFanLanguage={setFanLanguage}
        targetGate={targetGate}
        offer={offer}
        onAcceptOffer={handleAcceptSimulation}
        onDismissOffer={() => setOffer(null)}
      />
    </div>
  );
}

export default App;