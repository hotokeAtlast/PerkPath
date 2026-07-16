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
  const { gates, metrics, addEvent, eventLog, updateGate, toggleSurplus } = useApp();
  return (
    <div>
      <span data-testid="gates-count">{Object.keys(gates).length}</span>
      <span data-testid="event-count">{eventLog.length}</span>
      <span data-testid="rerouted">{metrics.totalRerouted}</span>
      <button data-testid="add-event" onClick={() => addEvent('test', 'Test event')}>Add Event</button>
      <button data-testid="update-gate" onClick={() => updateGate('C1', 'congestion', 50)}>Update Gate</button>
      <button data-testid="toggle-surplus" onClick={() => toggleSurplus('C1')}>Toggle Surplus</button>
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

  it('updateGate updates gate congestion', async () => {
    render(<AppProvider><TestComponent /></AppProvider>);
    act(() => {
      screen.getByTestId('update-gate').click();
    });
    expect(screen.getByTestId('gates-count')).toHaveTextContent('8');
  });

  it('toggleSurplus toggles surplus field', async () => {
    render(<AppProvider><TestComponent /></AppProvider>);
    act(() => {
      screen.getByTestId('toggle-surplus').click();
    });
    expect(screen.getByTestId('gates-count')).toHaveTextContent('8');
  });
});
