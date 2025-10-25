import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { toastService, Toast as ToastType } from '../services/toast';

interface ToastItemProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    // Wait for animation to complete before actually dismissing
    setTimeout(() => {
      onDismiss(toast.id);
    }, 300);
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle size={16} />;
      case 'error':
        return <AlertCircle size={16} />;
      case 'warning':
        return <AlertTriangle size={16} />;
      case 'info':
      default:
        return <Info size={16} />;
    }
  };

  const getTypeStyles = () => {
    const baseStyles = {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-sm)',
      padding: 'var(--space-md)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid',
      background: 'var(--bg-primary)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      minWidth: '300px',
      maxWidth: '500px',
      transition: 'all 0.3s ease',
      transform: isExiting ? 'translateX(100%)' : 'translateX(0)',
      opacity: isExiting ? 0 : 1,
    } as const;

    switch (toast.type) {
      case 'success':
        return {
          ...baseStyles,
          borderColor: 'var(--success)',
          color: 'var(--success)',
        };
      case 'error':
        return {
          ...baseStyles,
          borderColor: 'var(--error)',
          color: 'var(--error)',
        };
      case 'warning':
        return {
          ...baseStyles,
          borderColor: 'var(--warning)',
          color: 'var(--warning)',
        };
      case 'info':
      default:
        return {
          ...baseStyles,
          borderColor: 'var(--accent-primary)',
          color: 'var(--accent-primary)',
        };
    }
  };

  return (
    <div style={getTypeStyles()}>
      <div style={{ flexShrink: 0 }}>
        {getIcon()}
      </div>
      
      <div style={{ 
        flex: 1, 
        color: 'var(--text-primary)',
        fontSize: '0.875rem',
        lineHeight: '1.4'
      }}>
        {toast.message}
      </div>
      
      {toast.action && (
        <button
          onClick={toast.action.onClick}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent-primary)',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '600',
            padding: 'var(--space-xs) var(--space-sm)',
            borderRadius: 'var(--radius-sm)',
            marginRight: 'var(--space-xs)'
          }}
        >
          {toast.action.label}
        </button>
      )}
      
      <button
        onClick={handleDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          padding: 'var(--space-xs)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
        title="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastType[]>([]);

  useEffect(() => {
    const unsubscribe = toastService.subscribe(setToasts);
    return unsubscribe;
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 'var(--space-xl)',
        right: 'var(--space-xl)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-sm)',
        pointerEvents: 'none'
      }}
    >
      {toasts.map(toast => (
        <div key={toast.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem
            toast={toast}
            onDismiss={toastService.dismiss.bind(toastService)}
          />
        </div>
      ))}
    </div>
  );
}