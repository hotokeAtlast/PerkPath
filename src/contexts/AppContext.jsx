import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { generateOffer, generateAutoPilotDecision, generateMockScenario, getApiQuota } from '../services/aiService';

const AppContext = createContext(null);

const INITIAL_GATES = {
  A1: { id: 'A1', name: 'Gate A1', zone: 'North', type: 'Public Entry', capacity: 12000, congestion: 15, vendorItem: 'Cold Drinks', surplus: true },
  A2: { id: 'A2', name: 'Gate A2', zone: 'North', type: 'VIP Entry', capacity: 3000, congestion: 8, vendorItem: 'Premium Snacks', surplus: false },
  B1: { id: 'B1', name: 'Gate B1', zone: 'East', type: 'Transit Hub', capacity: 12000, congestion: 30, vendorItem: 'Hot Dogs', surplus: false },
  B2: { id: 'B2', name: 'Gate B2', zone: 'East', type: 'Accessible', capacity: 2000, congestion: 12, vendorItem: 'Coffee', surplus: true },
  C1: { id: 'C1', name: 'Gate C1', zone: 'South', type: 'Parking Entry', capacity: 12000, congestion: 90, vendorItem: 'Team Jerseys', surplus: false },
  C2: { id: 'C2', name: 'Gate C2', zone: 'South', type: 'Premium', capacity: 4000, congestion: 22, vendorItem: 'Nachos', surplus: true },
  D1: { id: 'D1', name: 'Gate D1', zone: 'West', type: 'Media/VIP', capacity: 12000, congestion: 45, vendorItem: 'Bottled Water', surplus: false },
  D2: { id: 'D2', name: 'Gate D2', zone: 'West', type: 'General', capacity: 12000, congestion: 55, vendorItem: 'Popcorn', surplus: true },
};

function getFanId() {
  let id = localStorage.getItem('perkpath_fan_id');
  if (!id) {
    const gate = Object.keys(INITIAL_GATES)[Math.floor(Math.random() * Object.keys(INITIAL_GATES).length)];
    const num = Math.floor(Math.random() * 9000) + 1000;
    id = `FAN-${gate}-2026-${num}`;
    localStorage.setItem('perkpath_fan_id', id);
  }
  return id;
}

export function AppProvider({ children }) {
  const [gates, setGates] = useState(INITIAL_GATES);
  const [targetGate, setTargetGate] = useState('C1');
  const [offer, setOffer] = useState(null);
  const [offerMeta, setOfferMeta] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [fanLanguage, setFanLanguage] = useState('English');
  const [fanId] = useState(getFanId);
  const [eventLog, setEventLog] = useState([]);
  const [metrics, setMetrics] = useState({
    totalRerouted: 0,
    revenueGenerated: 0,
    congestionAvoided: 0,
    offersSent: 0,
    acceptanceRate: 0,
  });
  const [autoPilot, setAutoPilot] = useState(false);
  const autoPilotRunning = useRef(false);

  const hasEnvKey = !!import.meta.env.VITE_GEMINI_API_KEY;
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [showConfigModal, setShowConfigModal] = useState(!localStorage.getItem('gemini_api_key'));
  const [errorMsg, setErrorMsg] = useState('');
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((title, message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-4), { id, title, message, type, duration }]);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addEvent = useCallback((type, message, level = 'info') => {
    setEventLog(prev => [{
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString(),
      type,
      message,
      level
    }, ...prev.slice(0, 99)]);
  }, []);

  const handleSaveApiKey = useCallback((key) => {
    localStorage.setItem('gemini_api_key', key);
    setApiKey(key);
    setShowConfigModal(false);
  }, []);

  const handleClearKey = useCallback(() => {
    localStorage.removeItem('gemini_api_key');
    setApiKey('');
    setShowConfigModal(true);
  }, []);

  const updateGate = useCallback((gateId, field, value) => {
    setGates(prev => ({
      ...prev,
      [gateId]: { ...prev[gateId], [field]: value }
    }));
  }, []);

  const toggleSurplus = useCallback((gateId) => {
    setGates(prev => ({
      ...prev,
      [gateId]: { ...prev[gateId], surplus: !prev[gateId].surplus }
    }));
  }, []);

  const triggerAI = useCallback(async () => {
    const finalKey = import.meta.env.VITE_GEMINI_API_KEY || apiKey;
    if (!finalKey) {
      setShowConfigModal(true);
      return;
    }

    setIsGenerating(true);
    setErrorMsg('');
    addEvent('ai', `Triggering PerkPath AI for ${targetGate} reroute...`);

    try {
      const currentGates = gates;
      const targetData = currentGates[targetGate];
      if (!targetData) throw new Error('Invalid target gate');

      const alternativeGates = Object.entries(currentGates)
        .filter(([id, data]) => id !== targetGate && data.congestion < 50 && data.surplus)
        .sort((a, b) => a[1].congestion - b[1].congestion);

      let optimalGate = 'A2';
      let optimalPerk = 'a surprise reward';

      if (alternativeGates.length > 0) {
        optimalGate = alternativeGates[0][0];
        optimalPerk = `50% off ${alternativeGates[0][1].vendorItem}`;
      }

      addEvent('negotiation', `Auction: ${optimalGate} selected (${currentGates[optimalGate]?.vendorItem})`);

      setOfferMeta({ optimalGate, optimalPerk });

      const generatedText = await generateOffer(
        finalKey,
        targetGate,
        optimalGate,
        optimalPerk,
        fanLanguage
      );

      setOffer(generatedText);
      addEvent('dispatch', `Push sent to fan ${fanId} (${fanLanguage}): "${generatedText.slice(0, 60)}..."`);
    } catch (error) {
      if (error.message === 'API_KEY_MISSING') {
        setShowConfigModal(true);
      } else if (error.message?.includes('503') || error.message?.includes('UNAVAILABLE')) {
        addToast('API Unavailable', 'Gemini API is experiencing high demand. Using fallback templates.', 'warning');
        setErrorMsg('AI temporarily unavailable. Using fallback offer.');
        addEvent('ai', `API 503 — fallback offer used`, 'warning');
      } else {
        setErrorMsg('AI Generation Failed. Check API key or network.');
        addEvent('ai', `ERROR: ${error.message}`, 'error');
        addToast('AI Error', `Offer generation failed: ${error.message}`, 'error');
      }
    } finally {
      setIsGenerating(false);
    }
  }, [gates, targetGate, fanLanguage, apiKey, fanId, addEvent, addToast]);

  const handleAcceptOffer = useCallback(() => {
    if (!offerMeta) return;
    const reduction = 15 + Math.floor(Math.random() * 10);
    setGates(prev => ({
      ...prev,
      [targetGate]: { ...prev[targetGate], congestion: Math.max(0, prev[targetGate].congestion - reduction) }
    }));
    setMetrics(m => ({
      ...m,
      totalRerouted: m.totalRerouted + 1,
      revenueGenerated: m.revenueGenerated + 8.50,
      congestionAvoided: m.congestionAvoided + reduction,
      offersSent: m.offersSent + 1,
      acceptanceRate: ((m.totalRerouted + 1) / Math.max(1, m.offersSent + 1) * 100).toFixed(1)
    }));
    addEvent('redeem', `Fan ${fanId} accepted: ${offerMeta.optimalPerk} at ${offerMeta.optimalGate} — congestion -${reduction}%`, 'success');
    setOffer(null);
    setOfferMeta(null);
  }, [offerMeta, targetGate, fanId, addEvent]);

  const dismissOffer = useCallback(() => {
    setOffer(null);
    setOfferMeta(null);
  }, []);

  const runAutoPilot = useCallback(async () => {
    const finalKey = import.meta.env.VITE_GEMINI_API_KEY || apiKey;
    if (!finalKey || autoPilotRunning.current) return;

    autoPilotRunning.current = true;
    try {
      const decision = await generateAutoPilotDecision(finalKey, gates);
      if (!decision) return;

      addEvent('ai', `[AUTO-PILOT] ${decision.reasoning}`, 'info');

      if (decision.action === 'reroute' && decision.congestedGate) {
        const cGate = decision.congestedGate;
        const cData = gates[cGate];
        if (!cData) return;

        const alternatives = Object.entries(gates)
          .filter(([id, g]) => id !== cGate && g.congestion < 50 && g.surplus)
          .sort((a, b) => a[1].congestion - b[1].congestion);

        const optGate = alternatives.length > 0 ? alternatives[0][0] : 'A2';
        const optPerk = `50% off ${gates[optGate]?.vendorItem || 'surprise reward'}`;

        addEvent('negotiation', `[AUTO-PILOT] Vendor auction for ${cGate} (${cData.congestion}%): ${optGate} selected — ${optPerk}`);

        setTargetGate(cGate);
        setOfferMeta({ optimalGate: optGate, optimalPerk: optPerk });

        const generatedText = await generateOffer(finalKey, cGate, optGate, optPerk, 'English');
        setOffer(generatedText);
        addEvent('dispatch', `[AUTO-PILOT] Offer dispatched to fan ${fanId}: "${generatedText.slice(0, 60)}..."`);

        await new Promise(resolve => setTimeout(resolve, 3000));

        const reduction = 15 + Math.floor(Math.random() * 10);
        setGates(prev => ({
          ...prev,
          [cGate]: { ...prev[cGate], congestion: Math.max(0, prev[cGate].congestion - reduction) }
        }));
        setMetrics(m => ({
          ...m,
          totalRerouted: m.totalRerouted + 1,
          revenueGenerated: m.revenueGenerated + 8.50,
          congestionAvoided: m.congestionAvoided + reduction,
          offersSent: m.offersSent + 1,
          acceptanceRate: ((m.totalRerouted + 1) / Math.max(1, m.offersSent + 1) * 100).toFixed(1)
        }));
        addEvent('redeem', `[AUTO-PILOT] Fan accepted: ${optPerk} at ${optGate} — ${cGate} congestion -${reduction}%`, 'success');

        setOffer(null);
        setOfferMeta(null);
      }

      if (decision.action === 'simulate_congestion' && decision.gateId) {
        setGates(prev => {
          const updated = { ...prev };
          if (updated[decision.gateId]) {
            updated[decision.gateId] = { ...updated[decision.gateId], congestion: Math.min(100, decision.newLevel || 85) };
          }
          return updated;
        });
        addEvent('cv', `[AUTO-PILOT] Simulated congestion spike at ${decision.gateId}`, 'warning');
      }
    } catch (err) {
      const is503 = err.message?.includes('503') || err.message?.includes('UNAVAILABLE');
      if (is503) {
        addToast('Auto-Pilot', 'Gemini API busy — using local decision engine', 'warning', 4000);
        addEvent('ai', `[AUTO-PILOT] API 503 — using local fallback`, 'warning');
      } else {
        addEvent('ai', `[AUTO-PILOT] Error: ${err.message}`, 'error');
        addToast('Auto-Pilot Error', err.message, 'error');
      }
    } finally {
      autoPilotRunning.current = false;
    }
  }, [gates, apiKey, fanId, addEvent, addToast]);

  const generateScenario = useCallback(async () => {
    const finalKey = import.meta.env.VITE_GEMINI_API_KEY || apiKey;
    if (!finalKey) {
      setShowConfigModal(true);
      return;
    }

    setIsGenerating(true);
    addEvent('ai', 'Requesting GenAI scenario generation...');

    try {
      const scenario = await generateMockScenario(finalKey);
      if (scenario && scenario.gates) {
        setGates(prev => {
          const updated = { ...prev };
          Object.entries(scenario.gates).forEach(([id, data]) => {
            if (updated[id]) updated[id] = { ...updated[id], ...data };
          });
          return updated;
        });
        addEvent('ai', `Scenario loaded: ${scenario.description || 'Match day simulation'}`, 'success');
        addToast('Scenario Loaded', scenario.description || 'Match day simulation loaded successfully', 'success', 4000);
      }
    } catch (err) {
      const is503 = err.message?.includes('503') || err.message?.includes('UNAVAILABLE');
      if (is503) {
        addToast('Scenario Failed', 'Gemini API busy — try again in a moment', 'warning');
        addEvent('ai', 'Scenario generation: API 503 — unavailable', 'warning');
      } else {
        addEvent('ai', `Scenario generation failed: ${err.message}`, 'error');
        addToast('Scenario Failed', err.message, 'error');
      }
    } finally {
      setIsGenerating(false);
    }
  }, [apiKey, addEvent, addToast]);

  const runAutoPilotRef = useRef(runAutoPilot);
  runAutoPilotRef.current = runAutoPilot;

  useEffect(() => {
    if (!autoPilot) return;
    const interval = setInterval(() => runAutoPilotRef.current(), 30000);
    return () => clearInterval(interval);
  }, [autoPilot]);

  useEffect(() => {
    if (offer && offerMeta) {
      setMetrics(m => ({ ...m, offersSent: m.offersSent + 1 }));
    }
  }, [offer, offerMeta]);

  const value = {
    gates, targetGate, setTargetGate, offer, offerMeta, isGenerating,
    fanLanguage, setFanLanguage, fanId, eventLog, metrics, autoPilot, setAutoPilot,
    hasEnvKey, apiKey, setApiKey, showConfigModal, setShowConfigModal,
    errorMsg, setErrorMsg, addEvent, handleSaveApiKey, handleClearKey,
    updateGate, toggleSurplus, triggerAI, handleAcceptOffer, dismissOffer,
    runAutoPilot, generateScenario, INITIAL_GATES, apiQuota: getApiQuota(),
    toasts, addToast, dismissToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
