import { useState, useEffect } from 'react';
import Toast from '../components/Toast';
import '../App.css';

const WIDGETS = [
  { path: '/timer', name: 'Timer', icon: '⏱️' },
  { path: '/projects', name: 'Projetos', icon: '📁' },
  { path: '/sessions', name: 'Sessões', icon: '📊' },
  { path: '/reports', name: 'Relatórios', icon: '📈' },
  { path: '/column-chart', name: 'Gráfico de Colunas', icon: '📊' },
  { path: '/row-chart', name: 'Gráfico de Barras', icon: '📊' },
  { path: '/pie-chart', name: 'Gráfico de Pizza', icon: '🥧' },
  { path: '/settings', name: 'Configurações', icon: '⚙️' },
];

export default function HomePage() {
  const [token, setToken] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    // Obter token da query string ou localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromQuery = urlParams.get('token');
    
    if (tokenFromQuery) {
      setToken(tokenFromQuery);
      localStorage.setItem('auth_token', tokenFromQuery);
    } else {
      const tokenFromStorage = localStorage.getItem('auth_token');
      setToken(tokenFromStorage);
    }
  }, []);

  function getToken(): string | null {
    return token;
  }

  function openWidget(path: string) {
    const currentToken = getToken();
    if (!currentToken) {
      setToast({ message: 'Token não encontrado. Adicione ?token=SEU_TOKEN na URL.', type: 'error' });
      return;
    }

    const url = `${window.location.origin}${path}?token=${encodeURIComponent(currentToken)}`;
    window.open(url, '_blank');
  }

  function copyLink(path: string) {
    const currentToken = getToken();
    if (!currentToken) {
      setToast({ message: 'Token não encontrado. Adicione ?token=SEU_TOKEN na URL.', type: 'error' });
      return;
    }

    const url = `${window.location.origin}${path}?token=${encodeURIComponent(currentToken)}`;
    
    // Tentar usar a API moderna do clipboard primeiro
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setToast({ message: 'Link copiado para a área de transferência!', type: 'success' });
      }).catch(() => {
        // Fallback para método alternativo se clipboard API falhar
        fallbackCopyTextToClipboard(url);
      });
    } else {
      // Usar método alternativo se clipboard API não estiver disponível
      fallbackCopyTextToClipboard(url);
    }
  }

  function fallbackCopyTextToClipboard(text: string) {
    try {
      // Criar um elemento de texto temporário
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // Tornar o elemento invisível mas ainda selecionável
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      textArea.style.opacity = '0';
      
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      // Tentar copiar usando execCommand (método antigo mas funciona em iframes)
      const successful = document.execCommand('copy');
      
      document.body.removeChild(textArea);
      
      if (successful) {
        setToast({ message: 'Link copiado para a área de transferência!', type: 'success' });
      } else {
        // Se tudo falhar, mostrar o link para o usuário copiar manualmente
        setToast({ 
          message: `Link: ${text}`, 
          type: 'info' 
        });
      }
    } catch (err) {
      // Se tudo falhar, mostrar o link para o usuário copiar manualmente
      setToast({ 
        message: `Link: ${text}`, 
        type: 'info' 
      });
    }
  }

  function handleRefresh() {
    // Recarregar token da URL ou localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromQuery = urlParams.get('token');
    
    if (tokenFromQuery) {
      setToken(tokenFromQuery);
      localStorage.setItem('auth_token', tokenFromQuery);
    } else {
      const tokenFromStorage = localStorage.getItem('auth_token');
      setToken(tokenFromStorage);
    }
  }

  const currentToken = getToken();

  return (
    <div className="widget-container">
      <div className="flex-between mb-1" style={{ alignItems: 'center' }}>
        <h2 className="widget-title" style={{ fontSize: '1rem', marginBottom: 0 }}>Widgets Disponíveis</h2>
        <button
          onClick={handleRefresh}
          title="Atualizar"
          style={{ padding: '0.25rem', fontSize: '0.75rem', minWidth: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
            <path d="M21 3v5h-5"></path>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
            <path d="M3 21v-5h5"></path>
          </svg>
        </button>
      </div>

      {!currentToken && (
        <div className="card mb-1" style={{ padding: '0.5rem' }}>
          <p style={{ fontSize: '0.85rem', margin: 0, color: '#666' }}>
            Token não encontrado. Adicione ?token=SEU_TOKEN na URL.
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
        {WIDGETS.map((widget) => (
          <div key={widget.path} className="card" style={{ padding: '0.5rem' }}>
            <div className="flex-between gap-1" style={{ alignItems: 'center' }}>
              <div className="flex gap-1" style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{widget.icon}</span>
                <span style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {widget.name}
                </span>
              </div>
              <div className="flex gap-1" style={{ flexShrink: 0 }}>
                <button
                  onClick={() => copyLink(widget.path)}
                  disabled={!currentToken}
                  title="Copiar link"
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    cursor: currentToken ? 'pointer' : 'not-allowed',
                    opacity: currentToken ? 1 : 0.6,
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  📋
                </button>
                <button
                  className="primary"
                  onClick={() => openWidget(widget.path)}
                  disabled={!currentToken}
                  title="Abrir widget"
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    cursor: currentToken ? 'pointer' : 'not-allowed',
                    opacity: currentToken ? 1 : 0.6,
                  }}
                >
                  Abrir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={toast.type === 'error' ? 6000 : 3000}
        />
      )}
    </div>
  );
}

