import { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { reportsApi, type ReportSummary, type PomodoroReport } from '../api/reports';
import { useActiveSession } from '../contexts/ActiveSessionContext';
import '../App.css';

export default function PieChartWidget() {
  const { activeSession } = useActiveSession();
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [pomodoroReport, setPomodoroReport] = useState<PomodoroReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [message, setMessage] = useState<{ text: string; type: 'error' } | null>(null);
  const previousActiveSessionRef = useRef<typeof activeSession>(null);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    loadReports();
  }, [period]);

  // Recarregar relatórios quando uma sessão ativa for finalizada (detectado via SSE)
  useEffect(() => {
    const hadActiveSession = previousActiveSessionRef.current !== null;
    const hasActiveSessionNow = activeSession !== null;

    if (hadActiveSession && !hasActiveSessionNow) {
      console.log('Sessão ativa finalizada detectada via SSE, recarregando relatórios...');
      loadReports();
    }

    previousActiveSessionRef.current = activeSession;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession]);

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

  // Preparar dados para o gráfico de pizza de tempo por projeto
  const timeByProjectData = summary?.byProject?.map(item => ({
    name: item.project?.name || 'Sem Projeto',
    value: parseFloat(formatHours(item.totalSeconds)),
    totalSeconds: item.totalSeconds,
    sessionCount: item.sessionCount,
    color: item.project?.color || '#999999',
  })) || [];

  // Preparar dados para o gráfico de pizza de pomodoros por projeto
  const pomodoroByProjectData = pomodoroReport?.byProject?.map(item => ({
    name: item.project?.name || 'Sem Projeto',
    value: item.count,
    color: item.project?.color || '#999999',
  })) || [];

  // Custom tooltip para tempo por projeto
  const TimeTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const total = timeByProjectData.reduce((sum, item) => sum + item.value, 0);
      const percent = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0';
      
      return (
        <div
          style={{
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '0.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.85rem' }}>{data.name}</p>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>
            {formatDuration(data.totalSeconds)} ({data.value}h)
          </p>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#666' }}>
            {percent}% do total
          </p>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#666' }}>
            {data.sessionCount} sessões
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip para pomodoros
  const PomodoroTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const total = pomodoroByProjectData.reduce((sum, item) => sum + item.value, 0);
      const percent = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0';
      
      return (
        <div
          style={{
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '0.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.85rem' }}>{data.name}</p>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>
            {data.value} pomodoro{data.value !== 1 ? 's' : ''}
          </p>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#666' }}>
            {percent}% do total
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <div className="widget-container with-timer-space">Carregando...</div>;
  }

  return (
    <div className="widget-container with-timer-space">
      <div className="flex mb-1" style={{ alignItems: 'center', gap: '0.5rem' }}>
        <h2 className="widget-title" style={{ fontSize: '1rem', marginBottom: 0 }}>Gráfico de Pizza</h2>
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

      {/* Period selector tabs */}
      <div className="flex gap-1 mb-1" style={{ width: '100%' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem', marginBottom: '0.5rem' }}>
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
            {pomodoroReport && (
              <div className="card" style={{ padding: '0.5rem' }}>
                <h3 style={{ fontSize: '0.85rem', marginBottom: '0.25rem', marginTop: 0 }}>Pomodoros</h3>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', lineHeight: '1.2' }}>
                  {pomodoroReport.total}
                </div>
              </div>
            )}
          </div>

          {/* Tempo por Projeto - Gráfico de Pizza */}
          <div className="card mb-1" style={{ padding: '0.5rem' }}>
            <h3 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', marginTop: 0 }}>Tempo por Projeto</h3>
            {timeByProjectData.length === 0 ? (
              <p style={{ fontSize: '0.75rem', margin: 0 }}>Nenhum dado no período selecionado.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={timeByProjectData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ percent }) => percent && percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {timeByProjectData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<TimeTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => {
                      const item = timeByProjectData.find(d => d.name === value);
                      return item ? `${value} (${item.value.toFixed(1)}h)` : value;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}

      {/* Pomodoros por Projeto - Gráfico de Pizza */}
      {pomodoroReport && pomodoroReport.byProject && pomodoroReport.byProject.length > 0 && (
        <div className="card" style={{ padding: '0.5rem' }}>
          <h3 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', marginTop: 0 }}>
            Pomodoros por Projeto
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pomodoroByProjectData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percent }) => percent && percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pomodoroByProjectData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<PomodoroTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => {
                  const item = pomodoroByProjectData.find(d => d.name === value);
                  return item ? `${value} (${item.value})` : value;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

