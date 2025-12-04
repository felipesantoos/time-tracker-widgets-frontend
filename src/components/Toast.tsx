import { useEffect } from 'react';
import '../App.css';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10001,
        padding: '0.75rem 1.5rem',
        borderRadius: '4px',
        backgroundColor: type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1',
        color: type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460',
        border: `1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'}`,
        fontSize: '0.9rem',
        fontWeight: type === 'error' ? '500' : 'normal',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
        minWidth: '300px',
        maxWidth: '90vw',
        textAlign: 'center',
        animation: 'slideDown 0.3s ease-out',
      }}
      role="alert"
    >
      {message}
    </div>
  );
}




