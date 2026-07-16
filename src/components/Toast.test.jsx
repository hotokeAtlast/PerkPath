import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import Toast from './Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders toast with title and message', () => {
    const toasts = [{ id: 1, title: 'Test Title', message: 'Test message', type: 'info', duration: 5000 }];
    render(<Toast toasts={toasts} onDismiss={vi.fn()} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders multiple toasts', () => {
    const toasts = [
      { id: 1, title: 'First', message: 'msg1', type: 'info', duration: 5000 },
      { id: 2, title: 'Second', message: 'msg2', type: 'warning', duration: 5000 },
    ];
    render(<Toast toasts={toasts} onDismiss={vi.fn()} />);
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('auto-dismisses after duration', () => {
    const onDismiss = vi.fn();
    const toasts = [{ id: 42, title: 'Auto', message: 'gone soon', type: 'error', duration: 3000 }];
    render(<Toast toasts={toasts} onDismiss={onDismiss} />);
    expect(screen.getByText('Auto')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(3300); });
    expect(onDismiss).toHaveBeenCalledWith(42);
  });

  it('dismisses on click', () => {
    const onDismiss = vi.fn();
    const toasts = [{ id: 99, title: 'Clickable', message: 'click me', type: 'success', duration: 5000 }];
    render(<Toast toasts={toasts} onDismiss={onDismiss} />);
    screen.getByText('Clickable').click();
    act(() => { vi.advanceTimersByTime(400); });
    expect(onDismiss).toHaveBeenCalledWith(99);
  });

  it('has accessible dismiss button', () => {
    const toasts = [{ id: 1, title: 'A11y', message: 'accessible', type: 'info', duration: 5000 }];
    render(<Toast toasts={toasts} onDismiss={vi.fn()} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Dismiss notification')).toBeInTheDocument();
  });

  it('renders empty container when no toasts', () => {
    const { container } = render(<Toast toasts={[]} onDismiss={vi.fn()} />);
    expect(container.querySelector('[aria-live="polite"]')).toBeInTheDocument();
  });
});
