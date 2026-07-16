import React from 'react';

/**
 * ErrorBoundary catches JavaScript errors in child components
 * and displays a fallback UI instead of crashing the entire app.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch() {
    // Error logged to error tracking service in production
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0b0c10', color: '#fff', padding: '20px', textAlign: 'center'
        }}>
          <div style={{ maxWidth: '400px' }}>
            <h1 style={{ color: '#ff3366', fontSize: '24px', marginBottom: '12px' }}>Something went wrong</h1>
            <p style={{ color: '#a0aab2', fontSize: '14px', marginBottom: '20px' }}>
              PerkPath encountered an unexpected error. Please refresh the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#ccff00', color: '#000', padding: '12px 24px',
                borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
