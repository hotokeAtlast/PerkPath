import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';

function TestComponent() {
  const { isAdmin, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="admin-status">{isAdmin ? 'admin' : 'not-admin'}</span>
      <button data-testid="login-btn" onClick={() => login('012026')}>Login</button>
      <button data-testid="login-wrong" onClick={() => login('000000')}>Login Wrong</button>
      <button data-testid="logout-btn" onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('throws error when useAuth used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestComponent />)).toThrow('useAuth must be used within AuthProvider');
    consoleSpy.mockRestore();
  });

  it('initializes with isAdmin false', () => {
    render(<AuthProvider><TestComponent /></AuthProvider>);
    expect(screen.getByTestId('admin-status')).toHaveTextContent('not-admin');
  });

  it('login with correct PIN sets isAdmin to true', async () => {
    const user = userEvent.setup();
    render(<AuthProvider><TestComponent /></AuthProvider>);
    await user.click(screen.getByTestId('login-btn'));
    expect(screen.getByTestId('admin-status')).toHaveTextContent('admin');
  });

  it('login with wrong PIN returns false and keeps isAdmin false', async () => {
    const user = userEvent.setup();
    render(<AuthProvider><TestComponent /></AuthProvider>);
    await user.click(screen.getByTestId('login-wrong'));
    expect(screen.getByTestId('admin-status')).toHaveTextContent('not-admin');
  });

  it('logout sets isAdmin to false', async () => {
    const user = userEvent.setup();
    render(<AuthProvider><TestComponent /></AuthProvider>);
    await user.click(screen.getByTestId('login-btn'));
    expect(screen.getByTestId('admin-status')).toHaveTextContent('admin');
    await user.click(screen.getByTestId('logout-btn'));
    expect(screen.getByTestId('admin-status')).toHaveTextContent('not-admin');
  });

  it('login stores admin flag in sessionStorage', async () => {
    const user = userEvent.setup();
    render(<AuthProvider><TestComponent /></AuthProvider>);
    await user.click(screen.getByTestId('login-btn'));
    expect(sessionStorage.getItem('perkpath_admin')).toBe('true');
  });

  it('logout removes admin flag from sessionStorage', async () => {
    const user = userEvent.setup();
    render(<AuthProvider><TestComponent /></AuthProvider>);
    await user.click(screen.getByTestId('login-btn'));
    await user.click(screen.getByTestId('logout-btn'));
    expect(sessionStorage.getItem('perkpath_admin')).toBeNull();
  });
});
