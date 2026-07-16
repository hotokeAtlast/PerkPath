import { useEffect, useState } from 'react';

const TOAST_ICONS = {
  info: '💡',
  warning: '⚠️',
  error: '❌',
  success: '✅',
};

const TOAST_COLORS = {
  info: 'rgba(204, 255, 0, 0.15)',
  warning: 'rgba(255, 170, 0, 0.15)',
  error: 'rgba(255, 51, 102, 0.15)',
  success: 'rgba(0, 212, 126, 0.15)',
};

const TOAST_BORDERS = {
  info: 'var(--primary-accent)',
  warning: 'var(--warning)',
  error: 'var(--danger)',
  success: 'var(--success)',
};

/**
 * Toast notification component for admin dashboard.
 * Displays auto-dismissing messages for API status, errors, and events.
 */
export default function Toast({ toasts, onDismiss }) {
  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxWidth: '380px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }, toast.duration || 5000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '12px 16px',
        borderRadius: '12px',
        background: TOAST_COLORS[toast.type] || TOAST_COLORS.info,
        border: `1px solid ${TOAST_BORDERS[toast.type] || TOAST_BORDERS.info}`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        pointerEvents: 'auto',
        cursor: 'pointer',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateX(100%)' : 'translateX(0)',
      }}
      onClick={() => {
        setExiting(true);
        setTimeout(() => onDismiss(toast.id), 300);
      }}
    >
      <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>
        {TOAST_ICONS[toast.type] || TOAST_ICONS.info}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.title && (
          <div style={{
            fontWeight: '600',
            fontSize: '13px',
            color: 'var(--text-primary)',
            marginBottom: '2px',
          }}>
            {toast.title}
          </div>
        )}
        <div style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          lineHeight: '1.4',
        }}>
          {toast.message}
        </div>
      </div>
      <button
        aria-label="Dismiss notification"
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          padding: '2px',
          fontSize: '14px',
          lineHeight: 1,
          flexShrink: 0,
        }}
        onClick={(e) => {
          e.stopPropagation();
          setExiting(true);
          setTimeout(() => onDismiss(toast.id), 300);
        }}
      >
        ×
      </button>
    </div>
  );
}
