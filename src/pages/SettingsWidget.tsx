import { useState, useEffect } from 'react';
import { settingsApi } from '../api/settings';
import Toast from '../components/Toast';
import '../App.css';

export default function SettingsWidget() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  const [workMinutes, setWorkMinutes] = useState(25);
  const [shortBreakMinutes, setShortBreakMinutes] = useState(5);
  const [longBreakMinutes, setLongBreakMinutes] = useState(15);
  const [longBreakInterval, setLongBreakInterval] = useState(4);
  const [autoStartBreak, setAutoStartBreak] = useState(false);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const res = await settingsApi.getPomodoro();
      const data = res.data;
      if (data) {
        setWorkMinutes(data.workMinutes);
        setShortBreakMinutes(data.shortBreakMinutes);
        setLongBreakMinutes(data.longBreakMinutes);
        setLongBreakInterval(data.longBreakInterval);
        setAutoStartBreak(data.autoStartBreak);
      }
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
      setMessage({ text: 'Erro ao carregar configurações', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      await settingsApi.updatePomodoro({
        workMinutes,
        shortBreakMinutes,
        longBreakMinutes,
        longBreakInterval,
        autoStartBreak,
      });
      setMessage({ text: 'Configurações salvas com sucesso!', type: 'success' });
      loadSettings();
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      setMessage({ text: 'Erro ao salvar configurações', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleRefresh() {
    await loadSettings();
  }

  if (loading) {
    return <div className="widget-container">Carregando...</div>;
  }

  return (
    <div className="widget-container">
      {message && (
        <Toast
          message={message.text}
          type={message.type}
          onClose={() => setMessage(null)}
          duration={message.type === 'error' ? 6000 : 3000}
        />
      )}

      <div className="flex-between mb-1" style={{ alignItems: 'center' }}>
        <h2 className="widget-title" style={{ fontSize: '1rem', marginBottom: 0 }}>Configurações do Pomodoro</h2>
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

      <div className="card" style={{ padding: '0.5rem' }}>
        <div className="mb-1">
          <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Duração do Trabalho (min):</label>
          <input
            type="number"
            min="1"
            value={workMinutes}
            onChange={(e) => setWorkMinutes(parseInt(e.target.value) || 25)}
            style={{ padding: '0.3rem', fontSize: '0.8rem' }}
          />
        </div>

        <div className="mb-1">
          <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Pausa Curta (min):</label>
          <input
            type="number"
            min="1"
            value={shortBreakMinutes}
            onChange={(e) => setShortBreakMinutes(parseInt(e.target.value) || 5)}
            style={{ padding: '0.3rem', fontSize: '0.8rem' }}
          />
        </div>

        <div className="mb-1">
          <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Pausa Longa (min):</label>
          <input
            type="number"
            min="1"
            value={longBreakMinutes}
            onChange={(e) => setLongBreakMinutes(parseInt(e.target.value) || 15)}
            style={{ padding: '0.3rem', fontSize: '0.8rem' }}
          />
        </div>

        <div className="mb-1">
          <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Pausa Longa a cada X ciclos:</label>
          <input
            type="number"
            min="1"
            value={longBreakInterval}
            onChange={(e) => setLongBreakInterval(parseInt(e.target.value) || 4)}
            style={{ padding: '0.3rem', fontSize: '0.8rem' }}
          />
        </div>

        <div className="mb-1">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
            <input
              type="checkbox"
              checked={autoStartBreak}
              onChange={(e) => setAutoStartBreak(e.target.checked)}
              style={{ width: '16px', height: '16px' }}
            />
            Iniciar pausa automaticamente
          </label>
        </div>

        <button
          className="primary"
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', width: '100%' }}
        >
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  );
}

