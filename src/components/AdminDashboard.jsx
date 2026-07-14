import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Zap, TrendingUp, AlertTriangle, Users, Package, RotateCcw, Terminal, Shield, BarChart3, Bell } from 'lucide-react';

const VENDOR_CATALOG = [
  { item: 'Cold Drinks', margin: 0.65, prepTime: 15, distanceFromGateA: 30, distanceFromGateB: 80, distanceFromGateC: 120 },
  { item: 'Hot Dogs', margin: 0.55, prepTime: 45, distanceFromGateA: 50, distanceFromGateB: 20, distanceFromGateC: 90 },
  { item: 'Team Jerseys', margin: 0.45, prepTime: 5, distanceFromGateA: 100, distanceFromGateB: 60, distanceFromGateC: 25 },
  { item: 'Premium Snacks', margin: 0.70, prepTime: 10, distanceFromGateA: 40, distanceFromGateB: 70, distanceFromGateC: 110 },
  { item: 'Coffee', margin: 0.80, prepTime: 20, distanceFromGateA: 35, distanceFromGateB: 85, distanceFromGateC: 100 },
];

const computeVendorScore = (vendor, targetGate, gates) => {
  if (!vendor.surplus) return -Infinity;
  const distKey = `distanceFrom${targetGate.replace('Gate ', '')}`;
  const distance = vendor[distKey] || 100;
  const congestionPenalty = (gates[targetGate]?.congestion || 0) / 100;
  return (vendor.margin * 100) - (distance * 0.5) - (vendor.prepTime * 0.3) - (congestionPenalty * 50);
};

export default function AdminDashboard({ 
  gates, 
  targetGate, 
  setTargetGate, 
  setCongestion, 
  toggleSurplus, 
  triggerAI, 
  isGenerating,
  offer,
  lastOfferData
}) {
  const [eventLog, setEventLog] = useState([]);
  const [autoSimulate, setAutoSimulate] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [negotiationTrace, setNegotiationTrace] = useState([]);
  const [metrics, setMetrics] = useState({
    totalRerouted: 0,
    revenueGenerated: 0,
    congestionAvoided: 0,
    offersSent: 0,
    acceptanceRate: 0,
  });

  const addEvent = useCallback((type, message, level = 'info') => {
    setEventLog(prev => [{
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString(),
      type,
      message,
      level
    }, ...prev.slice(0, 49)]);
  }, []);

  useEffect(() => {
    if (offer && lastOfferData) {
      addEvent('ai', `GenAI offer generated for ${lastOfferData.fanLanguage} fan: "${offer.substring(0, 50)}..."`, 'success');
      addEvent('dispatch', `Push notification sent to fan at ${lastOfferData.targetGate} → reroute to ${lastOfferData.optimalGate}`, 'info');
      setMetrics(m => ({ ...m, offersSent: m.offersSent + 1 }));
    }
  }, [offer, lastOfferData, addEvent]);

  useEffect(() => {
    if (!autoSimulate) return;
    const interval = setInterval(() => {
      const gateNames = Object.keys(gates);
      const randomGate = gateNames[Math.floor(Math.random() * gateNames.length)];
      const newCongestion = Math.min(100, gates[randomGate].congestion + Math.floor(Math.random() * 15) + 5);
      setCongestion(randomGate, newCongestion);
      if (newCongestion > 70) addEvent('cv', `CV Alert: ${randomGate} congestion spike to ${newCongestion}%`, 'warning');
    }, 4000);
    return () => clearInterval(interval);
  }, [autoSimulate, gates, setCongestion, addEvent]);

  const runNegotiationSimulation = (gate) => {
    const targetData = gates[gate];
    if (!targetData) return;

    const candidates = VENDOR_CATALOG.map(v => ({
      ...v,
      surplus: gates[gate]?.vendorItem === v.item ? targetData.surplus : Math.random() > 0.7,
      gate
    })).filter(v => v.surplus);

    const scored = candidates.map(v => ({
      ...v,
      score: computeVendorScore(v, gate, gates)
    })).sort((a, b) => b.score - a.score);

    const trace = scored.slice(0, 3).map((v, i) => ({
      rank: i + 1,
      item: v.item,
      score: v.score.toFixed(1),
      margin: `${(v.margin * 100).toFixed(0)}%`,
      prepTime: `${v.prepTime}s`,
      distance: `${v[`distanceFrom${gate.replace('Gate ', '')}`]}m`,
      selected: i === 0
    }));

    setNegotiationTrace(trace);
    setSelectedVendor(scored[0] || null);
    addEvent('negotiation', `Vendor auction for ${gate}: ${trace.length} candidates evaluated`, 'info');
    return scored[0];
  };

  const handleTriggerAI = () => {
    const optimal = runNegotiationSimulation(targetGate);
    if (optimal) {
      triggerAI();
    }
  };

  const handleAcceptSimulation = () => {
    const reduction = 15 + Math.floor(Math.random() * 10);
    setCongestion(targetGate, Math.max(0, gates[targetGate].congestion - reduction));
    setMetrics(m => ({
      ...m,
      totalRerouted: m.totalRerouted + 1,
      revenueGenerated: m.revenueGenerated + (selectedVendor?.margin || 0.6) * 12,
      congestionAvoided: m.congestionAvoided + reduction,
      acceptanceRate: ((m.totalRerouted + 1) / Math.max(1, m.offersSent) * 100).toFixed(1)
    }));
    addEvent('redemption', `Fan accepted offer! ${targetGate} congestion -${reduction}% | Revenue +$${((selectedVendor?.margin || 0.6) * 12).toFixed(2)}`, 'success');
    setNegotiationTrace([]);
    setSelectedVendor(null);
  };

  return (
    <div className="admin-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="text-gradient">FlowPlay Command Center</h1>
          <p style={{ color: 'var(--text-secondary)' }}>FIFA World Cup 2026 Operational Intelligence</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={autoSimulate} onChange={e => setAutoSimulate(e.target.checked)} />
            <RotateCcw size={14} /> CV Sim
          </label>
          <Shield size={14} color="var(--primary-accent)" style={{ marginLeft: '8px' }} />
          <span style={{ fontSize: '12px', color: 'var(--primary-accent)', fontFamily: 'monospace' }}>GDPR/COPPA Compliant</span>
        </div>
      </div>

      <div className="two-col">
        {/* Left Column */}
        <div className="col-left">

          {/* KPI Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {[
              { icon: Users, label: 'Fans Rerouted', value: metrics.totalRerouted, color: 'var(--primary-accent)' },
              { icon: BarChart3, label: 'Revenue', value: `$${metrics.revenueGenerated.toFixed(0)}`, color: 'var(--secondary-accent)' },
              { icon: TrendingUp, label: 'Congestion Avoided', value: `${metrics.congestionAvoided}%`, color: 'var(--success)' },
              { icon: Bell, label: 'Acceptance Rate', value: `${metrics.acceptanceRate}%`, color: 'var(--warning)' },
            ].map((kpi, i) => (
              <div key={i} className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
                  <kpi.icon size={16} color={kpi.color} />
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>{kpi.label}</span>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Gate Congestion + CV Feed */}
          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={20} color="var(--primary-accent)" />
                Live Gate Congestion & CV Feed
              </h3>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span className={`status-dot ${gates[targetGate]?.congestion > 75 ? 'danger' : 'ok'}`} />
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{gates[targetGate]?.congestion > 75 ? 'BOTTLENECK' : 'NOMINAL'}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {Object.entries(gates).map(([name, data]) => (
                <div key={name} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', border: `1px solid ${data.congestion > 75 ? 'rgba(255,51,102,0.3)' : 'rgba(255,255,255,0.05)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: data.congestion > 75 ? 'var(--danger)' : data.congestion > 50 ? 'var(--warning)' : 'var(--success)', boxShadow: data.congestion > 75 ? '0 0 8px var(--danger)' : 'none' }} />
                      <span style={{ fontWeight: '600', fontSize: '15px' }}>{name}</span>
                      {targetGate === name && <Zap size={14} color="var(--primary-accent)" />}
                    </div>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: data.congestion > 75 ? 'var(--danger)' : 'var(--primary-accent)', fontVariantNumeric: 'tabular-nums' }}>{data.congestion}%</span>
                  </div>
                  <input
                    type="range"
                    min="0" max="100"
                    value={data.congestion}
                    onChange={(e) => setCongestion(name, parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: data.congestion > 75 ? 'var(--danger)' : 'var(--primary-accent)' }}
                    aria-label={`${name} congestion level`}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <span>Capacity: ~8,000 fans</span>
                    <span>Flow: {data.congestion > 75 ? 'CRITICAL' : data.congestion > 50 ? 'HIGH' : 'NORMAL'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vendor Negotiation Panel */}
          <div className="glass-panel">
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={20} color="var(--secondary-accent)" />
              Real-Time Vendor Auction Engine
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Target Gate: <strong>{targetGate}</strong> | Congestion: <strong>{gates[targetGate]?.congestion}%</strong> |
                  {selectedVendor ? (
                    <>Selected: <strong style={{ color: 'var(--primary-accent)' }}>{selectedVendor.item}</strong> (Score: {selectedVendor.score.toFixed(1)})</>
                  ) : (
                    <>Click "Run Auction" to evaluate candidates</>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {negotiationTrace.length > 0 ? (
                    negotiationTrace.map(v => (
                      <div key={v.item} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px', background: v.selected ? 'rgba(204, 255, 0, 0.1)' : 'rgba(255,255,255,0.03)',
                        borderRadius: '8px', border: `1px solid ${v.selected ? 'var(--primary-accent)' : 'rgba(255,255,255,0.05)'}`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                          <span style={{ fontWeight: 'bold', width: '24px', color: v.selected ? 'var(--primary-accent)' : 'inherit' }}>#{v.rank}</span>
                          <span style={{ minWidth: '100px' }}>{v.item}</span>
                          <span style={{ color: 'var(--primary-accent)', fontWeight: 'bold', fontFamily: 'monospace' }}>Score: {v.score}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Margin: {v.margin} · Prep: {v.prepTime} · Dist: {v.distance}</span>
                        </div>
                        {v.selected && <Zap size={16} color="var(--primary-accent)" />}
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                      <Package size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                      <p>No auction data. Select a congested gate and run negotiation.</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 style={{ marginBottom: '12px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>Auction Controls</h4>
                <button className="btn-primary" onClick={handleTriggerAI} disabled={isGenerating || gates[targetGate]?.congestion < 50} style={{ width: '100%', marginBottom: '12px', padding: '14px' }}>
                  {isGenerating ? 'Synthesizing...' : gates[targetGate]?.congestion < 50 ? 'Gate Not Congested' : 'Run Auction & Trigger AI'}
                </button>
                {selectedVendor && !isGenerating && (
                  <button className="btn-secondary" onClick={handleAcceptSimulation} style={{ width: '100%', padding: '14px' }}>
                    Simulate Fan Acceptance
                  </button>
                )}

                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>Inventory Override</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Object.entries(gates).map(([name, data]) => (
                      <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '12px' }}>
                        <span>{name}: {data.vendorItem}</span>
                        <button
                          onClick={() => toggleSurplus(name)}
                          style={{
                            padding: '4px 10px', borderRadius: '16px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold',
                            background: data.surplus ? 'var(--primary-accent)' : 'transparent',
                            color: data.surplus ? '#000' : 'var(--text-secondary)',
                            border: data.surplus ? 'none' : '1px solid var(--text-secondary)'
                          }}>
                          {data.surplus ? 'SURPLUS' : 'NORMAL'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Event Log / Operational Terminal */}
          <div className="glass-panel" style={{ minHeight: '200px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={20} color="var(--primary-accent)" />
                Operational Event Stream
              </h3>
              <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                <span style={{ color: 'var(--success)' }}>● CV</span>
                <span style={{ color: 'var(--primary-accent)' }}>● AI</span>
                <span style={{ color: 'var(--warning)' }}>● NEG</span>
                <span style={{ color: 'var(--secondary-accent)' }}>● DISP</span>
                <span style={{ color: 'var(--success)' }}>● REDEEM</span>
              </div>
            </div>
            <div style={{ maxHeight: '300px', overflow: 'auto', fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.6', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', padding: '12px' }}>
              {eventLog.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>
                  <Terminal size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
                  <p>Waiting for events... Trigger CV simulation or run AI auction.</p>
                </div>
              ) : (
                eventLog.map(e => (
                  <div key={e.id} style={{ display: 'flex', gap: '8px', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ color: 'var(--text-secondary)', minWidth: '60px' }}>{e.time}</span>
                    <span style={{
                      color: e.level === 'success' ? 'var(--success)' : e.level === 'warning' ? 'var(--warning)' : e.level === 'error' ? 'var(--danger)' :
                             e.type === 'cv' ? 'var(--success)' : e.type === 'ai' ? 'var(--primary-accent)' : e.type === 'negotiation' ? 'var(--warning)' : e.type === 'dispatch' ? 'var(--secondary-accent)' : 'var(--success)',
                      minWidth: '50px', textTransform: 'uppercase', fontWeight: 'bold', fontSize: '10px'
                    }}>[{e.type}]</span>
                    <span style={{ color: 'var(--text-primary)', flex: 1 }}>{e.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Map + Architecture */}
        <div className="col-right">
          <div className="glass-panel">
            <h3 style={{ marginBottom: '20px' }}>Dynamic Stadium Map</h3>
            <div style={{
              background: 'rgba(0,0,0,0.4)', borderRadius: '12px',
              border: '1px solid var(--surface-border)',
              position: 'relative', overflow: 'hidden', height: '400px'
            }}>
            {Object.entries(gates).map(([name, data], index) => {
              const isTarget = targetGate === name;
              const isDanger = data.congestion > 75;
              const top = index === 0 ? '20%' : index === 1 ? '50%' : '80%';
              const left = index === 0 ? '30%' : index === 1 ? '60%' : '40%';

              return (
                <div key={name}
                  onClick={() => setTargetGate(name)}
                  style={{
                    position: 'absolute', top, left, padding: '12px 20px', cursor: 'pointer',
                    background: isDanger ? 'rgba(255, 51, 102, 0.2)' : 'var(--surface-color)',
                    borderRadius: '12px',
                    border: `2px solid ${isTarget ? 'white' : (isDanger ? 'var(--danger)' : 'rgba(255,255,255,0.1)')}`,
                    boxShadow: isDanger ? '0 0 20px rgba(255, 51, 102, 0.4)' : 'none',
                    transition: 'all 0.3s ease'
                  }}>
                  <div style={{ fontWeight: 'bold', color: isTarget ? 'white' : 'inherit' }}>{name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{data.congestion}% Full</div>
                  {isDanger && <AlertTriangle size={12} color="var(--danger)" style={{ marginTop: '4px' }} />}
                </div>
              )
            })}
          </div>
          </div>

          {/* Architecture Diagram */}
          <div className="glass-panel" style={{ marginTop: '20px' }}>
            <h4 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={14} /> Production Architecture
            </h4>
            <pre style={{ fontSize: '10px', lineHeight: '1.5', color: 'var(--text-secondary)', overflow: 'auto', fontFamily: 'monospace' }}>{`┌─────────────┐    ┌──────────────┐    ┌─────────────────┐    ┌────────────────┐
│ CV Cameras  │───▶│ Event Bus    │───▶│ GenAI Orchestr. │───▶│ Push Gateway   │
│ (80k fans)  │    │ (Kafka/5G)   │    │ (Gemini 2.5    │    │ (FCM/APNs)     │
└─────────────┘    │ <30ms latency│    │  Flash + RAG)   │    │ <5s delivery   │
                   └──────────────┘    │ Guardrails +    │    └───────┬────────┘
              ┌─────────────┐           │ JSON Schema     │            │
              │ Vendor POS  │──────────▶│ Validation      │            ▼
              │ Inventory   │           └────────┬────────┘    ┌────────────────┐
              └─────────────┘                    │             │ Fan Mobile App │
                                                 ▼             │ QR Redemption  │
                                  ┌──────────────────────┐    │ Accessibility  │
                                  │ Observability Stack  │    └────────────────┘
                                  │ (Metrics, Logs,      │
                                  │  Traces, Alerts)     │
                                  └──────────────────────┘`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
