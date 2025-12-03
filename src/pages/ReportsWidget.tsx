import { useState, useEffect } from 'react';
import { reportsApi, type ReportSummary, type PomodoroReport } from '../api/reports';
import '../App.css';

export default function ReportsWidget() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [pomodoroReport, setPomodoroReport] = useState<PomodoroReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [message, setMessage] = useState<{ text: string; type: 'error' } | null>(null);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    loadReports();
  }, [period]);

  function getDateRange(period: 'today' | 'week' | 'month') {
    const today = new Date();
    const from = new Date();
    
    if (period === 'today') {
      from.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      const dayOfWeek = today.getDay();
      from.setDate(today.getDate() - dayOfWeek);
      from.setHours(0, 0, 0, 0);
    } else {
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
    }
    
    const to = new Date(today);
    to.setHours(23, 59, 59, 999);
    
    return {
      from: from.toISOString(),
      to: to.toISOString(),
    };
  }

  async function loadReports() {
    try {
      setLoading(true);
      const range = getDateRange(period);
      
      const [summaryRes, pomodoroRes] = await Promise.all([
        reportsApi.summary(range),
        reportsApi.pomodoro(range),
      ]);
      
      setSummary(summaryRes.data || null);
      setPomodoroReport(pomodoroRes.data || null);
    } catch (err) {
      console.error('Erro ao carregar relatórios:', err);
      setMessage({ text: 'Erro ao carregar relatórios', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  function formatHours(seconds: number): string {
    const hours = seconds / 3600;
    return hours.toFixed(1);
  }

  function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  if (loading) {
    return <div className="widget-container">Carregando...</div>;
  }

  return (
    <div className="widget-container">
      <div className="flex-between mb-2 gap-1">
        <h2 className="widget-title">Relatórios</h2>
        <div className="flex gap-1">
          <button
            onClick={() => setPeriod('today')}
            className={period === 'today' ? 'primary' : ''}
          >
            Hoje
          </button>
          <button
            onClick={() => setPeriod('week')}
            className={period === 'week' ? 'primary' : ''}
          >
            Esta Semana
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={period === 'month' ? 'primary' : ''}
          >
            Este Mês
          </button>
        </div>
      </div>

      {message && (
        <div
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            borderRadius: '4px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            border: '1px solid #f5c6cb',
            fontSize: '0.9rem',
          }}
        >
          {message.text}
        </div>
      )}

      {summary && (
        <>
          {/* Summary cards */}
          <div className="grid grid-2 mb-2">
            <div className="card">
              <h3>Total de Tempo</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                {formatHours(summary.totalSeconds)}h
              </div>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>
                {formatDuration(summary.totalSeconds)}
              </div>
            </div>
            <div className="card">
              <h3>Sessões</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                {summary.sessionCount}
              </div>
            </div>
          </div>

          {/* By project */}
          <div className="card mb-2">
            <h3>Tempo por Projeto</h3>
            {!summary?.byProject || summary.byProject.length === 0 ? (
              <p>Nenhum dado no período selecionado.</p>
            ) : (
              <div>
                {summary.byProject.map((item, index) => (
                  <div
                    key={item.project.id}
                    className="flex-between"
                    style={{
                      padding: '0.5rem',
                      borderBottom: index < summary.byProject.length - 1 ? '1px solid #eee' : 'none',
                      marginBottom: index < summary.byProject.length - 1 ? '0.25rem' : '0',
                    }}
                  >
                    <div className="flex gap-1" style={{ alignItems: 'center' }}>
                      {item.project && (
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '4px',
                            backgroundColor: item.project.color || '#999999',
                          }}
                        />
                      )}
                      <span>{item.project?.name || 'Sem Projeto'}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold' }}>
                        {formatHours(item.totalSeconds)}h
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>
                        {item.sessionCount} sessões
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Pomodoro report */}
      {pomodoroReport && (
        <div className="card">
          <h3>Pomodoros</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            {pomodoroReport.total}
          </div>
          {pomodoroReport?.byProject && pomodoroReport.byProject.length > 0 && (
            <div>
              <h4>Por Projeto:</h4>
              {pomodoroReport.byProject.map((item) => (
                <div
                  key={item.project.id}
                  className="flex-between mb-1"
                  style={{ padding: '0.5rem' }}
                >
                  <div className="flex gap-1" style={{ alignItems: 'center' }}>
                    {item.project && (
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '4px',
                          backgroundColor: item.project.color || '#999999',
                        }}
                      />
                    )}
                    <span>{item.project?.name || 'Sem Projeto'}</span>
                  </div>
                  <span style={{ fontWeight: 'bold' }}>{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

