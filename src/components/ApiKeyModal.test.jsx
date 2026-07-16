import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import ApiKeyModal from './ApiKeyModal';

describe('ApiKeyModal', () => {
  it('renders modal with title', () => {
    render(<ApiKeyModal onSave={vi.fn()} />);
    expect(screen.getByText('Welcome to PerkPath')).toBeInTheDocument();
  });

  it('renders API key input', () => {
    render(<ApiKeyModal onSave={vi.fn()} />);
    expect(screen.getByPlaceholderText('Paste your Gemini API key here...')).toBeInTheDocument();
  });

  it('renders save button', () => {
    render(<ApiKeyModal onSave={vi.fn()} />);
    expect(screen.getByText('Save Key & Launch Demo')).toBeInTheDocument();
  });

  it('calls onSave with API key on form submit', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<ApiKeyModal onSave={onSave} />);
    const input = screen.getByPlaceholderText('Paste your Gemini API key here...');
    await user.type(input, 'test-api-key-123');
    await user.click(screen.getByText('Save Key & Launch Demo'));
    expect(onSave).toHaveBeenCalledWith('test-api-key-123');
  });

  it('calls onSave with Enter key', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<ApiKeyModal onSave={onSave} />);
    const input = screen.getByPlaceholderText('Paste your Gemini API key here...');
    await user.type(input, 'my-long-api-key-123');
    await user.keyboard('{Enter}');
    expect(onSave).toHaveBeenCalledWith('my-long-api-key-123');
  });

  it('has link to get free API key', () => {
    render(<ApiKeyModal onSave={vi.fn()} />);
    const link = screen.getByText('aistudio.google.com/apikey');
    expect(link).toHaveAttribute('href', 'https://aistudio.google.com/apikey');
  });
});
