import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PinGate from './PinGate';
import { AuthProvider } from '../contexts/AuthContext';

function renderWithAuth(ui) {
  return render(<AuthProvider>{ui}</AuthProvider>);
}

describe('PinGate', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('renders PIN input fields', () => {
    renderWithAuth(<PinGate><div data-testid="child">Content</div></PinGate>);
    const inputs = document.querySelectorAll('input[type="password"]');
    expect(inputs.length).toBe(6);
  });

  it('renders operations access heading', () => {
    renderWithAuth(<PinGate><div data-testid="child">Content</div></PinGate>);
    expect(screen.getByText('Operations Access')).toBeInTheDocument();
  });

  it('does not render children when not authenticated', () => {
    renderWithAuth(<PinGate><div data-testid="child">Content</div></PinGate>);
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });

  it('renders children when already authenticated', () => {
    sessionStorage.setItem('perkpath_admin', 'true');
    renderWithAuth(<PinGate><div data-testid="child">Content</div></PinGate>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('shows error on wrong PIN', async () => {
    const user = userEvent.setup();
    renderWithAuth(<PinGate><div>Content</div></PinGate>);
    const inputs = document.querySelectorAll('input[type="password"]');
    await user.type(inputs[0], '0');
    await user.type(inputs[1], '0');
    await user.type(inputs[2], '0');
    await user.type(inputs[3], '0');
    await user.type(inputs[4], '0');
    await user.type(inputs[5], '0');
    expect(screen.getByText(/Invalid PIN/)).toBeInTheDocument();
  });

  it('accepts correct PIN and shows children', async () => {
    const user = userEvent.setup();
    renderWithAuth(<PinGate><div data-testid="child">Content</div></PinGate>);
    const inputs = document.querySelectorAll('input[type="password"]');
    await user.type(inputs[0], '0');
    await user.type(inputs[1], '1');
    await user.type(inputs[2], '2');
    await user.type(inputs[3], '0');
    await user.type(inputs[4], '2');
    await user.type(inputs[5], '6');
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
