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

  async function handleRefresh() {
    await loadReports();
  }

  if (loading) {
    return <div className="widget-container with-timer-space">Carregando...</div>;
  }

  return (
    <div className="widget-container with-timer-space" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="flex mb-1" style={{ alignItems: 'center', gap: '0.5rem' }}>
        <h2 className="widget-title" style={{ fontSize: '1rem', marginBottom: 0 }}>Relatórios</h2>
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

      {message && (
        <div
          style={{
            padding: '0.4rem 0.5rem',
            marginBottom: '0.5rem',
            borderRadius: '4px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            border: '1px solid #f5c6cb',
            fontSize: '0.75rem',
          }}
        >
          {message.text}
        </div>
      )}

      {summary && (
        <>
          {/* Summary cards */}
          <div className="grid grid-2 mb-1">
            <div className="card" style={{ padding: '0.5rem' }}>
              <h3 style={{ fontSize: '0.85rem', marginBottom: '0.25rem', marginTop: 0 }}>Total de Tempo</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', lineHeight: '1.2' }}>
                {formatHours(summary.totalSeconds)}h
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>
                {formatDuration(summary.totalSeconds)}
              </div>
            </div>
            <div className="card" style={{ padding: '0.5rem' }}>
              <h3 style={{ fontSize: '0.85rem', marginBottom: '0.25rem', marginTop: 0 }}>Sessões</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', lineHeight: '1.2' }}>
                {summary.sessionCount}
              </div>
            </div>
          </div>

          {/* By project */}
          <div className="card mb-1" style={{ padding: '0.5rem' }}>
            <h3 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', marginTop: 0 }}>Tempo por Projeto</h3>
            {!summary?.byProject || summary.byProject.length === 0 ? (
              <p style={{ fontSize: '0.75rem', margin: 0 }}>Nenhum dado no período selecionado.</p>
            ) : (
              <div>
                {summary.byProject.map((item, index) => (
                  <div
                    key={item.project.id}
                    className="flex-between"
                    style={{
                      padding: '0.4rem 0',
                      borderBottom: index < summary.byProject.length - 1 ? '1px solid #eee' : 'none',
                      marginBottom: index < summary.byProject.length - 1 ? '0.25rem' : '0',
                    }}
                  >
                    <div className="flex gap-1" style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
                      {item.project && (
                        <div
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '3px',
                            backgroundColor: item.project.color || '#999999',
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <span style={{ fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.project?.name || 'Sem Projeto'}</span>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '0.5rem' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                        {formatHours(item.totalSeconds)}h
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#666' }}>
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
        <div className="card" style={{ padding: '0.5rem' }}>
          <h3 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', marginTop: 0 }}>Pomodoros</h3>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', lineHeight: '1.2' }}>
            {pomodoroReport.total}
          </div>
          {pomodoroReport?.byProject && pomodoroReport.byProject.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.8rem', marginBottom: '0.4rem', marginTop: 0 }}>Por Projeto:</h4>
              {pomodoroReport.byProject.map((item) => (
                <div
                  key={item.project.id}
                  className="flex-between mb-1"
                  style={{ padding: '0.25rem 0' }}
                >
                  <div className="flex gap-1" style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
                    {item.project && (
                      <div
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '3px',
                          backgroundColor: item.project.color || '#999999',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <span style={{ fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.project?.name || 'Sem Projeto'}</span>
                  </div>
                  <span style={{ fontWeight: 'bold', fontSize: '0.85rem', flexShrink: 0, marginLeft: '0.5rem' }}>{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Period selector tabs at bottom */}
      <div className="flex gap-1 mt-auto" style={{ width: '100%', marginTop: 'auto', paddingTop: '0.5rem' }}>
        <button
          onClick={() => setPeriod('today')}
          className={period === 'today' ? 'primary' : ''}
          style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
        >
          Hoje
        </button>
        <button
          onClick={() => setPeriod('week')}
          className={period === 'week' ? 'primary' : ''}
          style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
        >
          Semana
        </button>
        <button
          onClick={() => setPeriod('month')}
          className={period === 'month' ? 'primary' : ''}
          style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
        >
          Mês
        </button>
      </div>
    </div>
  );
}

