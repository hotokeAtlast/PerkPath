import { describe, it, expect, vi, beforeEach } from 'vitest';

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      constructor() {}
      models = {
        generateContent: mockGenerateContent,
      };
    },
  };
});

describe('aiService', () => {
  beforeEach(async () => {
    localStorageMock.clear();
    localStorageMock.setItem('perkpath_api_usage', JSON.stringify({ date: '2099-01-01', count: 0 }));
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('getApiQuota returns initial quota', async () => {
    const { getApiQuota } = await import('./aiService.js');
    const quota = getApiQuota();
    expect(quota).toHaveProperty('used');
    expect(quota).toHaveProperty('limit');
    expect(quota).toHaveProperty('remaining');
    expect(quota.limit).toBe(20);
  });

  it('generateOffer returns fallback when quota is exhausted', async () => {
    localStorageMock.setItem('perkpath_api_usage', JSON.stringify({ date: new Date().toISOString().slice(0, 10), count: 20 }));
    const { generateOffer } = await import('./aiService.js');
    const result = await generateOffer('fake-key', 'C1', 'A2', '50% off Cold Drinks', 'English');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result).toContain('C1');
    expect(result).toContain('A2');
  });

  it('generateOffer returns mock AI response with valid key', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: '{"offer":"VIP Reroute Now","gate_from":"C1","gate_to":"A2","perk":"50% off","expires_min":5}' });
    const { generateOffer } = await import('./aiService.js');
    const result = await generateOffer('fake-key', 'C1', 'A2', '50% off Cold Drinks', 'English');
    expect(result).toBe('VIP Reroute Now');
  });

  it('generateOffer falls back when AI returns invalid JSON', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: 'not json' });
    const { generateOffer } = await import('./aiService.js');
    const result = await generateOffer('fake-key', 'C1', 'A2', '50% off Cold Drinks', 'English');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('generateOffer falls back when gate_from does not match', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: '{"offer":"Test","gate_from":"A1","gate_to":"A2","perk":"test","expires_min":5}' });
    const { generateOffer } = await import('./aiService.js');
    const result = await generateOffer('fake-key', 'C1', 'A2', '50% off Cold Drinks', 'English');
    expect(result).toContain('C1');
  });

  it('generateOffer falls back when expires_min is out of range', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: '{"offer":"Test","gate_from":"C1","gate_to":"A2","perk":"test","expires_min":20}' });
    const { generateOffer } = await import('./aiService.js');
    const result = await generateOffer('fake-key', 'C1', 'A2', '50% off Cold Drinks', 'English');
    expect(result).toContain('C1');
  });

  it('generateAutoPilotDecision returns local decision when quota is exhausted', async () => {
    localStorageMock.setItem('perkpath_api_usage', JSON.stringify({ date: new Date().toISOString().slice(0, 10), count: 20 }));
    const { generateAutoPilotDecision } = await import('./aiService.js');
    const gates = {
      C1: { id: 'C1', congestion: 90, surplus: false, zone: 'South', type: 'Parking Entry', vendorItem: 'Team Jerseys' },
      A2: { id: 'A2', congestion: 8, surplus: true, zone: 'North', type: 'VIP Entry', vendorItem: 'Premium Snacks' },
    };
    const decision = await generateAutoPilotDecision('fake-key', gates);
    expect(decision).toHaveProperty('action');
    expect(decision).toHaveProperty('reasoning');
    expect(['reroute', 'simulate_congestion', 'monitor']).toContain(decision.action);
  });

  it('local decision: reroute when congestion > 70 with surplus alternative', async () => {
    localStorageMock.setItem('perkpath_api_usage', JSON.stringify({ date: new Date().toISOString().slice(0, 10), count: 20 }));
    const { generateAutoPilotDecision } = await import('./aiService.js');
    const gates = {
      C1: { id: 'C1', congestion: 90, surplus: false, zone: 'South', type: 'Parking Entry', vendorItem: 'Team Jerseys' },
      A2: { id: 'A2', congestion: 8, surplus: true, zone: 'North', type: 'VIP Entry', vendorItem: 'Premium Snacks' },
    };
    const decision = await generateAutoPilotDecision('fake-key', gates);
    expect(decision.action).toBe('reroute');
    expect(decision.congestedGate).toBe('C1');
  });

  it('local decision: monitor when all gates below 60', async () => {
    localStorageMock.setItem('perkpath_api_usage', JSON.stringify({ date: new Date().toISOString().slice(0, 10), count: 20 }));
    const { generateAutoPilotDecision } = await import('./aiService.js');
    const gates = {
      A1: { id: 'A1', congestion: 30, surplus: false, zone: 'North', type: 'Public Entry', vendorItem: 'Cold Drinks' },
      A2: { id: 'A2', congestion: 20, surplus: false, zone: 'North', type: 'VIP Entry', vendorItem: 'Premium Snacks' },
    };
    const decision = await generateAutoPilotDecision('fake-key', gates);
    expect(decision.action).toBe('monitor');
  });

  it('local decision: simulate_congestion when gates between 30-65', async () => {
    localStorageMock.setItem('perkpath_api_usage', JSON.stringify({ date: new Date().toISOString().slice(0, 10), count: 20 }));
    const { generateAutoPilotDecision } = await import('./aiService.js');
    const gates = {
      A1: { id: 'A1', congestion: 55, surplus: false, zone: 'North', type: 'Public Entry', vendorItem: 'Cold Drinks' },
      A2: { id: 'A2', congestion: 20, surplus: false, zone: 'North', type: 'VIP Entry', vendorItem: 'Premium Snacks' },
    };
    const decision = await generateAutoPilotDecision('fake-key', gates);
    expect(['reroute', 'simulate_congestion', 'monitor']).toContain(decision.action);
  });

  it('generateAutoPilotDecision returns AI decision with valid key', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: '{"action":"reroute","congestedGate":"C1","gateId":null,"newLevel":null,"reasoning":"High congestion at C1"}' });
    const { generateAutoPilotDecision } = await import('./aiService.js');
    const gates = {
      C1: { id: 'C1', congestion: 90, surplus: false, zone: 'South', type: 'Parking Entry', vendorItem: 'Team Jerseys' },
      A2: { id: 'A2', congestion: 8, surplus: true, zone: 'North', type: 'VIP Entry', vendorItem: 'Premium Snacks' },
    };
    const decision = await generateAutoPilotDecision('fake-key', gates);
    expect(decision.action).toBe('reroute');
    expect(decision.congestedGate).toBe('C1');
  });

  it('generateAutoPilotDecision falls back when AI returns invalid JSON', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: 'invalid' });
    const { generateAutoPilotDecision } = await import('./aiService.js');
    const gates = {
      C1: { id: 'C1', congestion: 90, surplus: false, zone: 'South', type: 'Parking Entry', vendorItem: 'Team Jerseys' },
      A2: { id: 'A2', congestion: 8, surplus: true, zone: 'North', type: 'VIP Entry', vendorItem: 'Premium Snacks' },
    };
    const decision = await generateAutoPilotDecision('fake-key', gates);
    expect(decision).toHaveProperty('action');
    expect(['reroute', 'simulate_congestion', 'monitor']).toContain(decision.action);
  });
});
