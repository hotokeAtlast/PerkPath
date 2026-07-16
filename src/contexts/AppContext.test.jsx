import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AppProvider, useApp } from './AppContext';

vi.mock('../services/aiService.js', () => ({
  generateOffer: vi.fn().mockResolvedValue('Test offer'),
  generateAutoPilotDecision: vi.fn().mockResolvedValue({ action: 'monitor', reasoning: 'All clear' }),
  generateMockScenario: vi.fn().mockResolvedValue(null),
  getApiQuota: vi.fn().mockReturnValue({ used: 0, limit: 20, remaining: 20 }),
}));

function TestComponent() {
  const { gates, metrics, addEvent, eventLog, updateGate, toggleSurplus, fanId, autoPilot, setAutoPilot, fanLanguage, setFanLanguage } = useApp();
  return (
    <div>
      <span data-testid="gates-count">{Object.keys(gates).length}</span>
      <span data-testid="event-count">{eventLog.length}</span>
      <span data-testid="rerouted">{metrics.totalRerouted}</span>
      <span data-testid="c1-congestion">{gates.C1.congestion}</span>
      <span data-testid="c1-surplus">{gates.C1.surplus ? 'yes' : 'no'}</span>
      <span data-testid="fan-id">{fanId}</span>
      <span data-testid="autopilot">{autoPilot ? 'on' : 'off'}</span>
      <span data-testid="language">{fanLanguage}</span>
      <button data-testid="add-event" onClick={() => addEvent('test', 'Test event')}>Add Event</button>
      <button data-testid="update-gate" onClick={() => updateGate('C1', 'congestion', 50)}>Update Gate</button>
      <button data-testid="toggle-surplus" onClick={() => toggleSurplus('C1')}>Toggle Surplus</button>
      <button data-testid="set-autopilot" onClick={() => setAutoPilot(true)}>Enable AP</button>
      <button data-testid="set-language" onClick={() => setFanLanguage('Spanish')}>ES</button>
    </div>
  );
}

describe('AppContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes with 8 gates', () => {
    render(<AppProvider><TestComponent /></AppProvider>);
    expect(screen.getByTestId('gates-count')).toHaveTextContent('8');
  });

  it('initializes metrics with zeros', () => {
    render(<AppProvider><TestComponent /></AppProvider>);
    expect(screen.getByTestId('rerouted')).toHaveTextContent('0');
  });

  it('addEvent adds to event log', async () => {
    render(<AppProvider><TestComponent /></AppProvider>);
    expect(screen.getByTestId('event-count')).toHaveTextContent('0');
    act(() => {
      screen.getByTestId('add-event').click();
    });
    expect(screen.getByTestId('event-count')).toHaveTextContent('1');
  });

  it('updateGate updates gate congestion value', async () => {
    render(<AppProvider><TestComponent /></AppProvider>);
    expect(screen.getByTestId('c1-congestion')).toHaveTextContent('90');
    act(() => {
      screen.getByTestId('update-gate').click();
    });
    expect(screen.getByTestId('c1-congestion')).toHaveTextContent('50');
  });

  it('toggleSurplus toggles surplus field', async () => {
    render(<AppProvider><TestComponent /></AppProvider>);
    expect(screen.getByTestId('c1-surplus')).toHaveTextContent('no');
    act(() => {
      screen.getByTestId('toggle-surplus').click();
    });
    expect(screen.getByTestId('c1-surplus')).toHaveTextContent('yes');
  });

  it('generates a stable fan ID', () => {
    render(<AppProvider><TestComponent /></AppProvider>);
    const id = screen.getByTestId('fan-id').textContent;
    expect(id).toMatch(/^FAN-[A-Z]\d-2026-\d{4}$/);
  });

  it('autoPilot defaults to off', () => {
    render(<AppProvider><TestComponent /></AppProvider>);
    expect(screen.getByTestId('autopilot')).toHaveTextContent('off');
  });

  it('setAutoPilot toggles state', async () => {
    render(<AppProvider><TestComponent /></AppProvider>);
    act(() => {
      screen.getByTestId('set-autopilot').click();
    });
    expect(screen.getByTestId('autopilot')).toHaveTextContent('on');
  });

  it('setFanLanguage updates language', async () => {
    render(<AppProvider><TestComponent /></AppProvider>);
    expect(screen.getByTestId('language')).toHaveTextContent('English');
    act(() => {
      screen.getByTestId('set-language').click();
    });
    expect(screen.getByTestId('language')).toHaveTextContent('Spanish');
  });
});
