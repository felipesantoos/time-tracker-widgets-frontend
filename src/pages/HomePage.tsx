import { useState } from 'react';
import Toast from '../components/Toast';
import '../App.css';

const WIDGETS = [
  { path: '/timer', name: 'Timer', icon: '⏱️' },
  { path: '/projects', name: 'Projetos', icon: '📁' },
  { path: '/sessions', name: 'Sessões', icon: '📊' },
  { path: '/reports', name: 'Relatórios', icon: '📈' },
  { path: '/settings', name: 'Configurações', icon: '⚙️' },
];

export default function HomePage() {
  const [token, setToken] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  function openWidget(path: string) {
    if (!token.trim()) {
      alert('Por favor, insira um token');
      return;
    }

    const url = `${window.location.origin}${path}?token=${encodeURIComponent(token.trim())}`;
    window.open(url, '_blank');
  }

  function copyLink(path: string) {
    if (!token.trim()) {
      setToast({ message: 'Por favor, insira um token', type: 'error' });
      return;
    }

    const url = `${window.location.origin}${path}?token=${encodeURIComponent(token.trim())}`;
    
    navigator.clipboard.writeText(url).then(() => {
      setToast({ message: 'Link copiado para a área de transferência!', type: 'success' });
    }).catch(() => {
      setToast({ message: 'Erro ao copiar o link', type: 'error' });
    });
  }

  return (
    <div className="widget-container" style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '1rem' }}>Time Tracker Widgets</h1>
      
      <div className="card" style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
          Token de Autenticação:
        </label>
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Cole seu token aqui"
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            marginBottom: '1rem',
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && token.trim()) {
              openWidget('/timer');
            }
          }}
        />
        <p style={{ fontSize: '0.85rem', color: '#666', margin: 0 }}>
          Insira seu token e clique em um widget para abri-lo em uma nova aba
        </p>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {WIDGETS.map((widget) => (
          <div
            key={widget.path}
            style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'stretch',
            }}
          >
            <button
              className="primary"
              onClick={() => openWidget(widget.path)}
              disabled={!token.trim()}
              style={{
                flex: 1,
                padding: '1rem',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: token.trim() ? 'pointer' : 'not-allowed',
                opacity: token.trim() ? 1 : 0.6,
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>{widget.icon}</span>
              <span>{widget.name}</span>
            </button>
            <button
              onClick={() => copyLink(widget.path)}
              disabled={!token.trim()}
              title="Copiar link"
              style={{
                padding: '1rem',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: token.trim() ? 'pointer' : 'not-allowed',
                opacity: token.trim() ? 1 : 0.6,
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                minWidth: '50px',
              }}
            >
              📋
            </button>
          </div>
        ))}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <p style={{ fontSize: '0.9rem', color: '#666', margin: 0, textAlign: 'center' }}>
          Use as rotas: /timer, /projects, /sessions, /reports, /settings
        </p>
      </div>
    </div>
  );
}

