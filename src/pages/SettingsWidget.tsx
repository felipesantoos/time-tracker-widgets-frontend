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

      <h2 className="widget-title">Configurações do Pomodoro</h2>

      <div className="card">
        <div className="mb-1">
          <label>Duração do Trabalho (minutos):</label>
          <input
            type="number"
            min="1"
            value={workMinutes}
            onChange={(e) => setWorkMinutes(parseInt(e.target.value) || 25)}
          />
        </div>

        <div className="mb-1">
          <label>Duração da Pausa Curta (minutos):</label>
          <input
            type="number"
            min="1"
            value={shortBreakMinutes}
            onChange={(e) => setShortBreakMinutes(parseInt(e.target.value) || 5)}
          />
        </div>

        <div className="mb-1">
          <label>Duração da Pausa Longa (minutos):</label>
          <input
            type="number"
            min="1"
            value={longBreakMinutes}
            onChange={(e) => setLongBreakMinutes(parseInt(e.target.value) || 15)}
          />
        </div>

        <div className="mb-1">
          <label>Pausa Longa a cada X ciclos:</label>
          <input
            type="number"
            min="1"
            value={longBreakInterval}
            onChange={(e) => setLongBreakInterval(parseInt(e.target.value) || 4)}
          />
        </div>

        <div className="mb-2">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={autoStartBreak}
              onChange={(e) => setAutoStartBreak(e.target.checked)}
            />
            Iniciar pausa automaticamente
          </label>
        </div>

        <button
          className="primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  );
}

