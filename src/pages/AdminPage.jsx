import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Zap, TrendingUp, Users, Package, Terminal, Shield, BarChart3, Bell, Eye, Bot, Pause, RefreshCw } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

const VENDOR_CATALOG = [
  { item: 'Cold Drinks', margin: 0.65, prepTime: 15, distA1: 30, distA2: 50, distB1: 80, distB2: 60, distC1: 120, distC2: 100, distD1: 90, distD2: 110 },
  { item: 'Hot Dogs', margin: 0.55, prepTime: 45, distA1: 50, distA2: 70, distB1: 20, distB2: 40, distC1: 90, distC2: 80, distD1: 60, distD2: 70 },
  { item: 'Team Jerseys', margin: 0.45, prepTime: 5, distA1: 100, distA2: 80, distB1: 60, distB2: 90, distC1: 25, distC2: 30, distD1: 70, distD2: 50 },
  { item: 'Premium Snacks', margin: 0.70, prepTime: 10, distA1: 40, distA2: 20, distB1: 70, distB2: 50, distC1: 110, distC2: 90, distD1: 80, distD2: 100 },
  { item: 'Coffee', margin: 0.80, prepTime: 20, distA1: 35, distA2: 25, distB1: 85, distB2: 65, distC1: 100, distC2: 80, distD1: 45, distD2: 90 },
  { item: 'Nachos', margin: 0.60, prepTime: 30, distA1: 60, distA2: 40, distB1: 30, distB2: 50, distC1: 80, distC2: 60, distD1: 70, distD2: 50 },
  { item: 'Bottled Water', margin: 0.50, prepTime: 5, distA1: 20, distA2: 30, distB1: 40, distB2: 25, distC1: 70, distC2: 55, distD1: 35, distD2: 45 },
  { item: 'Popcorn', margin: 0.75, prepTime: 25, distA1: 55, distA2: 35, distB1: 65, distB2: 45, distC1: 40, distC2: 30, distD1: 50, distD2: 20 },
];

export default function AdminPage() {
  const {
    gates, targetGate, setTargetGate, isGenerating,
    eventLog, metrics, autoPilot, setAutoPilot, apiQuota,
    addEvent, updateGate, toggleSurplus, triggerAI, handleAcceptOffer, generateScenario,
  } = useApp();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [negotiationTrace, setNegotiationTrace] = useState([]);

  const computeVendorScore = useCallback((vendor, gateId) => {
    if (!vendor.surplus) return -Infinity;
    const distKey = `dist${gateId}`;
    const distance = vendor[distKey] || 100;
    const congestionPenalty = (gates[gateId]?.congestion || 0) / 100;
    return (vendor.margin * 100) - (distance * 0.5) - (vendor.prepTime * 0.3) - (congestionPenalty * 50);
  }, [gates]);

  const runNegotiation = useCallback((gateId) => {
    const candidates = VENDOR_CATALOG.map(v => ({
      ...v,
      surplus: gates[gateId]?.vendorItem === v.item ? gates[gateId].surplus : Math.random() > 0.6,
    })).filter(v => v.surplus);

    const scored = candidates.map(v => ({
      ...v,
      score: computeVendorScore(v, gateId),
    })).sort((a, b) => b.score - a.score);

    const trace = scored.slice(0, 3).map((v, i) => ({
      rank: i + 1, item: v.item, score: v.score.toFixed(1),
      margin: `${(v.margin * 100).toFixed(0)}%`, prepTime: `${v.prepTime}s`,
      distance: `${v[`dist${gateId}`] || '?'}m`, selected: i === 0,
    }));

    setNegotiationTrace(trace);
    setSelectedVendor(scored[0] || null);
    addEvent('negotiation', `Auction for ${gateId}: ${trace.length} candidates scored`);
    return scored[0];
  }, [gates, computeVendorScore, addEvent]);

  const handleTriggerAI = useCallback(() => {
    const optimal = runNegotiation(targetGate);
    if (optimal) triggerAI();
  }, [runNegotiation, targetGate, triggerAI]);

  const handleAcceptSim = useCallback(() => {
    handleAcceptOffer();
    setSelectedVendor(null);
    setNegotiationTrace([]);
  }, [handleAcceptOffer]);

  const totalCapacity = Object.values(gates).reduce((sum, g) => sum + g.capacity, 0);
  const totalCongested = Object.values(gates).filter(g => g.congestion > 75).length;

  return (
    <div className="admin-view" id="main-content" role="region" aria-label="Admin command center">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate('/fan')} aria-label="View fan experience" style={{
            display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(138,43,226,0.15)',
            padding: '6px 12px', borderRadius: '20px', border: 'none', color: 'var(--secondary-accent)',
            fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit'
          }}>
            <Eye size={14} />
            Fan View
          </button>
          <div>
            <h1 className="text-gradient" style={{ fontSize: '24px' }}>PerkPath Command Center</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>FIFA World Cup 2026 · {totalCapacity.toLocaleString()} capacity · {Object.keys(gates).length} gates</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setAutoPilot(!autoPilot)} aria-label={autoPilot ? 'Disable auto-pilot' : 'Enable auto-pilot'} aria-pressed={autoPilot} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px',
            border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold',
            background: autoPilot ? 'var(--primary-accent)' : 'rgba(255,255,255,0.05)',
            color: autoPilot ? '#000' : 'var(--text-secondary)',
          }}>
            {autoPilot ? <Pause size={14} /> : <Bot size={14} />}
            {autoPilot ? 'Auto-Pilot ON' : 'Auto-Pilot'}
          </button>
          <button onClick={generateScenario} disabled={isGenerating} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px',
            border: '1px solid var(--surface-border)', background: 'transparent', cursor: 'pointer',
            fontSize: '12px', color: 'var(--text-secondary)',
          }}>
            <RefreshCw size={14} /> {isGenerating ? 'Generating...' : 'Gen Scenario'}
          </button>
          <span style={{ fontSize: '11px', color: 'var(--primary-accent)', fontFamily: 'monospace' }}>
            <Shield size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />SECURE
          </span>
          <span style={{
            fontSize: '10px', fontFamily: 'monospace', padding: '4px 8px', borderRadius: '10px',
            background: apiQuota.remaining > 5 ? 'rgba(0,255,136,0.1)' : apiQuota.remaining > 0 ? 'rgba(255,170,0,0.1)' : 'rgba(255,51,102,0.1)',
            color: apiQuota.remaining > 5 ? 'var(--success)' : apiQuota.remaining > 0 ? 'var(--warning)' : 'var(--danger)',
          }}>
            API: {apiQuota.used}/{apiQuota.limit}
          </span>
          <button onClick={() => { logout(); navigate('/fan'); }} aria-label="Logout and view fan experience" style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,51,102,0.1)', color: 'var(--danger)', border: '1px solid var(--danger)',
            padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px',
          }}><Shield size={12} />Logout</button>
        </div>
      </div>

      <div className="two-col">
        {/* Left Column */}
        <div className="col-left">
          {/* KPI Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {[
              { icon: Users, label: 'Rerouted', value: metrics.totalRerouted, color: 'var(--primary-accent)' },
              { icon: BarChart3, label: 'Revenue', value: `$${metrics.revenueGenerated.toFixed(0)}`, color: 'var(--secondary-accent)' },
              { icon: TrendingUp, label: 'Avoided', value: `${metrics.congestionAvoided}%`, color: 'var(--success)' },
              { icon: Bell, label: 'Accept Rate', value: `${metrics.acceptanceRate}%`, color: 'var(--warning)' },
            ].map((kpi, i) => (
              <div key={i} className="glass-panel" style={{ padding: '14px', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '6px' }}>
                  <kpi.icon size={14} color={kpi.color} />
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{kpi.label}</span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Gate Congestion Grid */}
          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
                <Activity size={18} color="var(--primary-accent)" />
                Live Gate Congestion
              </h3>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span className={`status-dot ${totalCongested > 0 ? 'danger' : 'ok'}`} />
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{totalCongested > 0 ? `${totalCongested} BOTTLENECK${totalCongested > 1 ? 'S' : ''}` : 'NOMINAL'}</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {Object.entries(gates).map(([id, data]) => (
                <div key={id} role="button" tabIndex={0}
                  onClick={() => setTargetGate(id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTargetGate(id); } }}
                  style={{
                    background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px',
                    border: `1px solid ${data.congestion > 75 ? 'rgba(255,51,102,0.3)' : 'rgba(255,255,255,0.05)'}`,
                    cursor: 'pointer', transition: 'border-color 0.2s', outline: 'none',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary-accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = data.congestion > 75 ? 'rgba(255,51,102,0.3)' : 'rgba(255,255,255,0.05)'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: data.congestion > 75 ? 'var(--danger)' : data.congestion > 50 ? 'var(--warning)' : 'var(--success)',
                        boxShadow: data.congestion > 75 ? '0 0 6px var(--danger)' : 'none'
                      }} />
                      <span style={{ fontWeight: '600', fontSize: '13px' }}>{data.name}</span>
                      {targetGate === id && <Zap size={12} color="var(--primary-accent)" />}
                    </div>
                    <span style={{
                      fontSize: '15px', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums',
                      color: data.congestion > 75 ? 'var(--danger)' : 'var(--primary-accent)'
                    }}>{data.congestion}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={data.congestion}
                    onChange={(e) => updateGate(id, 'congestion', parseInt(e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Congestion level for ${data.name}: ${data.congestion}%`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={data.congestion}
                    style={{ width: '100%', accentColor: data.congestion > 75 ? 'var(--danger)' : 'var(--primary-accent)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                    <span>{data.zone} · {data.type}</span>
                    <span>{(data.capacity / 1000).toFixed(0)}k</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vendor Auction */}
          <div className="glass-panel">
            <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
              <Package size={18} color="var(--secondary-accent)" />
              Vendor Auction Engine
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  Target: <strong>{gates[targetGate]?.name}</strong> ({gates[targetGate]?.congestion}%) · Vendor: {selectedVendor ? <strong style={{ color: 'var(--primary-accent)' }}>{selectedVendor.item}</strong> : '—'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {negotiationTrace.length > 0 ? negotiationTrace.map(v => (
                    <div key={v.item} style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px',
                      background: v.selected ? 'rgba(204,255,0,0.1)' : 'rgba(255,255,255,0.03)',
                      borderRadius: '8px', border: `1px solid ${v.selected ? 'var(--primary-accent)' : 'rgba(255,255,255,0.05)'}`,
                      fontSize: '12px',
                    }}>
                      <span style={{ fontWeight: 'bold', width: '20px', color: v.selected ? 'var(--primary-accent)' : 'inherit' }}>#{v.rank}</span>
                      <span style={{ minWidth: '90px' }}>{v.item}</span>
                      <span style={{ color: 'var(--primary-accent)', fontFamily: 'monospace', fontWeight: 'bold' }}>S:{v.score}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>M:{v.margin} P:{v.prepTime} D:{v.distance}</span>
                      {v.selected && <Zap size={14} color="var(--primary-accent)" style={{ marginLeft: 'auto' }} />}
                    </div>
                  )) : (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                      <Package size={24} style={{ opacity: 0.2, marginBottom: '8px' }} />
                      Click "Run Auction" to evaluate vendors
                    </div>
                  )}
                </div>
              </div>
              <div>
                <button className="btn-primary" onClick={handleTriggerAI} disabled={isGenerating || gates[targetGate]?.congestion < 50} style={{ width: '100%', marginBottom: '8px', padding: '12px', fontSize: '13px' }}>
                  {isGenerating ? 'Synthesizing...' : 'Run Auction & Trigger AI'}
                </button>
                {selectedVendor && !isGenerating && (
                  <button className="btn-secondary" onClick={handleAcceptSim} style={{ width: '100%', padding: '10px', fontSize: '12px' }}>
                    Simulate Accept
                  </button>
                )}
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>Inventory</h4>
                  {Object.entries(gates).slice(0, 4).map(([id, data]) => (
                    <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: '11px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{data.name}</span>
                      <button onClick={() => toggleSurplus(id)} aria-label={`Toggle surplus for ${data.name}: ${data.surplus ? 'surplus' : 'OK'}`} aria-pressed={data.surplus} style={{
                        padding: '2px 8px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold',
                        background: data.surplus ? 'var(--primary-accent)' : 'transparent',
                        color: data.surplus ? '#000' : 'var(--text-secondary)',
                      }}>{data.surplus ? 'SURPLUS' : 'OK'}</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Event Log */}
          <div className="glass-panel" style={{ minHeight: '180px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
                <Terminal size={18} color="var(--primary-accent)" />
                Event Stream
              </h3>
              <div style={{ display: 'flex', gap: '6px', fontSize: '10px' }}>
                <span style={{ color: 'var(--success)' }}>● CV</span>
                <span style={{ color: 'var(--primary-accent)' }}>● AI</span>
                <span style={{ color: 'var(--warning)' }}>● NEG</span>
                <span style={{ color: 'var(--secondary-accent)' }}>● DISP</span>
                <span style={{ color: 'var(--success)' }}>● REDEEM</span>
              </div>
            </div>
            <div aria-live="polite" aria-relevant="additions" style={{ maxHeight: '250px', overflow: 'auto', fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.5', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', padding: '10px' }}>
              {eventLog.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '30px', fontSize: '12px' }}>
                  Waiting for events...
                </div>
              ) : eventLog.map(e => (
                <div key={e.id} style={{ display: 'flex', gap: '6px', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ color: 'var(--text-secondary)', minWidth: '55px' }}>{e.time}</span>
                  <span style={{
                    color: e.level === 'success' ? 'var(--success)' : e.level === 'warning' ? 'var(--warning)' : e.level === 'error' ? 'var(--danger)' :
                      e.type === 'cv' ? 'var(--success)' : e.type === 'ai' ? 'var(--primary-accent)' : e.type === 'negotiation' ? 'var(--warning)' : e.type === 'dispatch' ? 'var(--secondary-accent)' : 'var(--success)',
                    minWidth: '40px', textTransform: 'uppercase', fontWeight: 'bold', fontSize: '9px'
                  }}>[{e.type}]</span>
                  <span style={{ color: 'var(--text-primary)', flex: 1 }}>{e.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-right">
          {/* Stadium Map */}
          <div className="glass-panel">
            <h3 style={{ marginBottom: '16px', fontSize: '15px' }}>Stadium Map</h3>
            <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '12px', border: '1px solid var(--surface-border)', padding: '10px' }}>
              <ResponsiveContainer width="100%" height={340}>
                <RadarChart data={Object.entries(gates).map(([id, d]) => ({
                  gate: id,
                  name: d.name,
                  congestion: d.congestion,
                  zone: d.zone,
                  type: d.type,
                  fullMark: 100,
                }))} cx="50%" cy="50%" outerRadius="72%">
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis
                    dataKey="gate"
                    tick={({ x, y, payload }) => {
                      const gid = payload.value;
                      const d = gates[gid];
                      const cong = d?.congestion || 0;
                      const color = cong > 75 ? '#ff3366' : cong > 50 ? '#ffaa00' : '#ccff00';
                      const isSelected = targetGate === gid;
                      return (
                        <text
                          x={x} y={y} textAnchor="middle"
                          fill={isSelected ? '#fff' : color}
                          fontWeight={isSelected ? '800' : '600'}
                          fontSize={isSelected ? 13 : 11}
                          style={{ cursor: 'pointer', textShadow: isSelected ? `0 0 8px ${color}` : 'none' }}
                          onClick={() => setTargetGate(gid)}
                        >
                          {gid}
                          <tspan x={x} dy={13} fontSize={9} fill="var(--text-secondary)" fontWeight="400">
                            {cong}%
                          </tspan>
                        </text>
                      );
                    }}
                  />
                  <Radar
                    name="Congestion"
                    dataKey="congestion"
                    stroke="var(--primary-accent)"
                    fill="var(--primary-accent)"
                    fillOpacity={0.15}
                    strokeWidth={2}
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      const cong = payload.congestion;
                      const color = cong > 75 ? '#ff3366' : cong > 50 ? '#ffaa00' : '#ccff00';
                      const r = targetGate === payload.gate ? 7 : 5;
                      return (
                        <circle
                          key={payload.gate} cx={cx} cy={cy} r={r}
                          fill={color} stroke={targetGate === payload.gate ? '#fff' : 'none'}
                          strokeWidth={2} style={{ cursor: 'pointer' }}
                          onClick={() => setTargetGate(payload.gate)}
                        />
                      );
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{
                          background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '8px', padding: '10px 14px', fontSize: '12px',
                        }}>
                          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{d.name}</div>
                          <div style={{ color: 'var(--text-secondary)' }}>{d.zone} · {d.type}</div>
                          <div style={{ color: d.congestion > 75 ? 'var(--danger)' : 'var(--primary-accent)', fontWeight: 'bold', marginTop: '4px' }}>
                            {d.congestion}% congestion
                          </div>
                        </div>
                      );
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Architecture */}
          <div className="glass-panel" style={{ marginTop: '20px' }}>
            <h4 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BarChart3 size={14} /> Production Architecture
            </h4>
            <pre style={{ fontSize: '9px', lineHeight: '1.4', color: 'var(--text-secondary)', overflow: 'auto', fontFamily: 'monospace' }}>{`┌──────────┐   ┌──────────┐   ┌───────────┐   ┌──────────┐
│ CV Cam   │──▶│ Kafka    │──▶│ Gemini    │──▶│ FCM/APNs │
│ (80k)    │   │ <30ms    │   │ 2.5 Flash │   │ <5s      │
└──────────┘   └──────────┘   │ + Guardr. │   └────┬─────┘
               ┌──────────┐   │ + JSON    │        │
               │ Vendor   │──▶│ Schema    │        ▼
               │ POS      │   └─────┬─────┘   ┌──────────┐
               └──────────┘         │         │ Fan App  │
                                    ▼         │ QR + TTS │
                              ┌──────────┐    └──────────┘
                              │ Observe  │
                              └──────────┘`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
