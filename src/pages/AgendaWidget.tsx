import { useState, useEffect, useRef, useMemo } from 'react';
import { sessionsApi, type TimeSession } from '../api/sessions';
import { projectsApi, type Project } from '../api/projects';
import { useActiveSession } from '../contexts/ActiveSessionContext';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { utcToLocalDatetime, localDatetimeToUtc } from '../utils/dateUtils';
import '../App.css';

interface SessionBar {
  session: TimeSession | { id: string; startTime: string; endTime: string | null; project: { id: string; name: string; color: string } | null; description?: string; durationSeconds: number; mode: string };
  startMinutes: number; // Minutos desde meia-noite (0-1440)
  endMinutes: number; // Minutos desde meia-noite (0-1440)
  isActive: boolean;
  column: number; // Coluna para sessões simultâneas
}

const HOUR_HEIGHT = 60; // Altura em pixels para cada hora
const MINUTES_PER_DAY = 1440;

export default function AgendaWidget() {
  const { activeSession, elapsedSeconds } = useActiveSession();
  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editProjectId, setEditProjectId] = useState<string>('');
  const [editStartTime, setEditStartTime] = useState<string>('');
  const [editEndTime, setEditEndTime] = useState<string>('');
  const previousActiveSessionRef = useRef<typeof activeSession>(null);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    loadSessions();
  }, [selectedDate]);

  // Recarregar sessões quando uma sessão ativa for finalizada (detectado via SSE)
  useEffect(() => {
    const hadActiveSession = previousActiveSessionRef.current !== null;
    const hasActiveSessionNow = activeSession !== null;

    if (hadActiveSession && !hasActiveSessionNow) {
      console.log('Sessão ativa finalizada detectada via SSE, recarregando agenda...');
      loadSessions();
    }

    previousActiveSessionRef.current = activeSession;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession]);

  function getDateRange(date: Date) {
    const from = new Date(date);
    from.setHours(0, 0, 0, 0);
    
    const to = new Date(date);
    to.setHours(23, 59, 59, 999);
    
    return {
      from: from.toISOString(),
      to: to.toISOString(),
    };
  }

  async function loadProjects() {
    try {
      const res = await projectsApi.list();
      const projectsList = res.data || [];
      setProjects(projectsList);
    } catch (err) {
      console.error('Erro ao carregar projetos:', err);
      setProjects([]);
    }
  }

  async function loadSessions() {
    try {
      setLoading(true);
      const range = getDateRange(selectedDate);
      
      // Buscar todas as sessões do dia (sem paginação)
      const res = await sessionsApi.list({
        from: range.from,
        to: range.to,
        limit: 1000, // Limite alto para pegar todas as sessões do dia
      });
      
      const sessionsList = res.data || [];
      setSessions(sessionsList);
    } catch (err) {
      console.error('Erro ao carregar sessões:', err);
      setMessage({ text: 'Erro ao carregar sessões', type: 'error' });
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  // Converter data para minutos desde meia-noite do dia selecionado
  function dateToMinutes(date: Date): number {
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    
    const diffMs = date.getTime() - dayStart.getTime();
    return Math.floor(diffMs / (1000 * 60));
  }

  // Calcular todas as sessões com posicionamento e colunas
  const sessionBars = useMemo(() => {
    const bars: SessionBar[] = [];
    const selectedDateStart = new Date(selectedDate);
    selectedDateStart.setHours(0, 0, 0, 0);
    const selectedDateEnd = new Date(selectedDate);
    selectedDateEnd.setHours(23, 59, 59, 999);
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);

    // Processar sessões finalizadas
    sessions.forEach((session) => {
      const startTime = new Date(session.startTime);
      const endTime = new Date(session.endTime);
      
      // Verificar se a sessão está no dia selecionado
      if (startTime > selectedDateEnd || endTime < selectedDateStart) {
        return;
      }

      // Ajustar para o dia selecionado
      const effectiveStart = startTime < selectedDateStart ? selectedDateStart : startTime;
      const effectiveEnd = endTime > selectedDateEnd ? selectedDateEnd : endTime;

      const startMinutes = dateToMinutes(effectiveStart);
      const endMinutes = dateToMinutes(effectiveEnd);

      if (startMinutes >= 0 && endMinutes <= MINUTES_PER_DAY && startMinutes < endMinutes) {
        bars.push({
          session,
          startMinutes,
          endMinutes,
          isActive: false,
          column: 0, // Será calculado depois
        });
      }
    });

    // Processar sessão ativa
    if (activeSession && activeSession.active && activeSession.startTime) {
      const activeStartTime = new Date(activeSession.startTime);
      const activeEndTime = new Date();
      
      const activeStartDate = new Date(activeStartTime);
      activeStartDate.setHours(0, 0, 0, 0);
      const activeEndDate = new Date(activeEndTime);
      activeEndDate.setHours(0, 0, 0, 0);
      
      if (activeStartDate.getTime() <= selectedDateOnly.getTime() && activeEndDate.getTime() >= selectedDateOnly.getTime()) {
        const effectiveStart = activeStartDate.getTime() === selectedDateOnly.getTime() 
          ? activeStartTime 
          : selectedDateStart;
        const effectiveEnd = activeEndTime > selectedDateEnd ? selectedDateEnd : activeEndTime;

        const startMinutes = dateToMinutes(effectiveStart);
        const endMinutes = dateToMinutes(effectiveEnd);

        if (startMinutes >= 0 && endMinutes <= MINUTES_PER_DAY && startMinutes < endMinutes) {
          bars.push({
            session: {
              id: activeSession.id || 'active',
              startTime: activeSession.startTime,
              endTime: null,
              project: activeSession.project ?? null,
              description: activeSession.description,
              durationSeconds: elapsedSeconds,
              mode: activeSession.mode || 'stopwatch',
            },
            startMinutes,
            endMinutes,
            isActive: true,
            column: 0, // Será calculado depois
          });
        }
      }
    }

    // Calcular colunas para sessões simultâneas
    // Ordenar por horário de início
    bars.sort((a, b) => a.startMinutes - b.startMinutes);

    // Agrupar sessões sobrepostas e atribuir colunas
    const columns: SessionBar[][] = [];
    
    bars.forEach((bar) => {
      // Encontrar uma coluna onde não há sobreposição
      let placed = false;
      for (let colIndex = 0; colIndex < columns.length; colIndex++) {
        const column = columns[colIndex];
        // Verificar se não há sobreposição com nenhuma sessão nesta coluna
        const hasOverlap = column.some((existingBar) => {
          return !(bar.endMinutes <= existingBar.startMinutes || bar.startMinutes >= existingBar.endMinutes);
        });
        
        if (!hasOverlap) {
          column.push(bar);
          bar.column = colIndex;
          placed = true;
          break;
        }
      }
      
      // Se não encontrou coluna, criar nova
      if (!placed) {
        columns.push([bar]);
        bar.column = columns.length - 1;
      }
    });

    return bars;
  }, [sessions, activeSession, selectedDate, elapsedSeconds]);

  function handlePreviousDay() {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  }

  function handleNextDay() {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  }

  function handleToday() {
    setSelectedDate(new Date());
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.value) {
      setSelectedDate(new Date(e.target.value));
    }
  }

  async function handleRefresh() {
    await Promise.all([loadProjects(), loadSessions()]);
  }

  async function handleSessionClick(bar: SessionBar) {
    // Não permitir editar sessão ativa
    if (bar.isActive) {
      setMessage({ text: 'Não é possível editar uma sessão em andamento', type: 'error' });
      return;
    }

    // Verificar se é uma TimeSession válida (não a sessão ativa)
    if ('endTime' in bar.session && bar.session.endTime !== null) {
      // Garantir que os projetos estão carregados antes de abrir o modal
      if (projects.length === 0) {
        await loadProjects();
      }
      const session = bar.session as TimeSession;
      startEdit(session);
    }
  }

  function startEdit(session: TimeSession) {
    setEditingId(session.id);
    setEditDescription(session.description || '');
    setEditProjectId(session.projectId || '');
    
    // Converter datas UTC para formato de input datetime-local (horário local)
    setEditStartTime(utcToLocalDatetime(session.startTime));
    setEditEndTime(utcToLocalDatetime(session.endTime));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDescription('');
    setEditProjectId('');
    setEditStartTime('');
    setEditEndTime('');
  }

  async function handleUpdate(id: string) {
    try {
      const updateData: {
        description?: string;
        projectId?: string | null;
        startTime?: string;
        endTime?: string;
      } = {};

      if (editDescription !== undefined) {
        updateData.description = editDescription.trim() || undefined;
      }

      if (editProjectId !== undefined) {
        updateData.projectId = editProjectId && editProjectId.trim() !== '' ? editProjectId.trim() : null;
      }

      if (editStartTime) {
        // Converter de horário local para UTC
        updateData.startTime = localDatetimeToUtc(editStartTime);
      }

      if (editEndTime) {
        // Converter de horário local para UTC
        updateData.endTime = localDatetimeToUtc(editEndTime);
      }

      await sessionsApi.update(id, updateData);
      cancelEdit();
      setMessage({ text: 'Sessão atualizada com sucesso!', type: 'success' });
      await loadSessions();
    } catch (err) {
      console.error('Erro ao atualizar sessão:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar sessão';
      setMessage({ text: errorMessage, type: 'error' });
    }
  }

  function getDateDisplay(date: Date): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(date);
    selected.setHours(0, 0, 0, 0);
    
    if (selected.getTime() === today.getTime()) {
      return 'Hoje';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (selected.getTime() === yesterday.getTime()) {
      return 'Ontem';
    }
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (selected.getTime() === tomorrow.getTime()) {
      return 'Amanhã';
    }
    
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // Calcular número máximo de colunas para ajustar largura
  const maxColumns = useMemo(() => {
    if (sessionBars.length === 0) return 1;
    return Math.max(...sessionBars.map(bar => bar.column)) + 1;
  }, [sessionBars]);

  // Calcular primeira hora a exibir (omitir primeiras 5 horas se não houver sessões)
  const startHour = useMemo(() => {
    if (sessionBars.length === 0) return 5; // Começar em 05:00 se não houver sessões
    
    const earliestStart = Math.min(...sessionBars.map(bar => bar.startMinutes));
    const earliestHour = Math.floor(earliestStart / 60);
    
    // Se a primeira sessão começa antes das 05:00, mostrar a partir de 00:00
    // Se começa após 05:00, começar em 05:00 (omitir primeiras 5 horas)
    return earliestHour < 5 ? 0 : 5;
  }, [sessionBars]);

  // Calcular última hora a exibir
  const endHour = useMemo(() => {
    if (sessionBars.length === 0) return 23;
    
    const latestEnd = Math.max(...sessionBars.map(bar => bar.endMinutes));
    const latestHour = Math.ceil(latestEnd / 60);
    
    return Math.min(latestHour, 23);
  }, [sessionBars]);

  if (loading) {
    return <div className="widget-container with-timer-space">Carregando...</div>;
  }

  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const timelineHeight = HOUR_HEIGHT * (endHour - startHour + 1);

  return (
    <div className="widget-container with-timer-space">
      {message && (
        <Toast
          message={message.text}
          type={message.type}
          onClose={() => setMessage(null)}
          duration={message.type === 'error' ? 6000 : 3000}
        />
      )}

      <div className="flex mb-1" style={{ alignItems: 'center', gap: '0.5rem' }}>
        <h2 className="widget-title" style={{ fontSize: '1rem', marginBottom: 0 }}>Agenda 24h</h2>
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

      {/* Date Navigation */}
      <div className="card mb-1" style={{ padding: '0.5rem' }}>
        <div className="flex gap-1" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handlePreviousDay}
            style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
            title="Dia anterior"
          >
            ←
          </button>
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={handleDateChange}
            style={{ padding: '0.3rem', fontSize: '0.75rem', flex: 1, minWidth: '120px' }}
          />
          <button
            onClick={handleNextDay}
            style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
            title="Próximo dia"
          >
            →
          </button>
          <button
            onClick={handleToday}
            style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
            title="Hoje"
          >
            Hoje
          </button>
        </div>
        <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', fontWeight: 'bold' }}>
          {getDateDisplay(selectedDate)}
        </div>
      </div>

      {/* Timeline Container */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ 
          maxHeight: 'calc(100vh - 250px)', 
          overflowY: 'auto',
          overflowX: 'hidden',
        }}>
          <div style={{ display: 'flex', position: 'relative', minHeight: `${timelineHeight}px` }}>
          {/* Time Labels */}
          <div style={{ 
            width: '60px', 
            flexShrink: 0, 
            borderRight: '1px solid #e0e0e0',
            backgroundColor: '#f9f9f9',
          }}>
            {hours.map((hour) => (
              <div
                key={hour}
                style={{
                  height: `${HOUR_HEIGHT}px`,
                  borderBottom: '1px solid #e0e0e0',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  color: '#666',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'flex-start',
                  paddingTop: '0.5rem',
                }}
              >
                {String(hour).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Timeline Content */}
          <div style={{ 
            flex: 1, 
            position: 'relative',
            backgroundColor: '#fff',
          }}>
            {/* Hour dividers */}
            {hours.map((hour, index) => (
              <div
                key={hour}
                style={{
                  position: 'absolute',
                  top: `${index * HOUR_HEIGHT}px`,
                  left: 0,
                  right: 0,
                  height: `${HOUR_HEIGHT}px`,
                  borderBottom: '1px solid #e0e0e0',
                  pointerEvents: 'none',
                }}
              />
            ))}

            {/* Session Bars */}
            {sessionBars.map((bar) => {
              // Ajustar posicionamento considerando o startHour
              const top = ((bar.startMinutes / 60) - startHour) * HOUR_HEIGHT;
              const height = ((bar.endMinutes - bar.startMinutes) / 60) * HOUR_HEIGHT;
              const color = bar.session.project?.color || '#999999';
              // Espaçamento entre colunas: 2px de margem
              const columnWidth = (100 - (maxColumns - 1) * 2) / maxColumns;
              const left = (bar.column * (columnWidth + 2));
              const width = columnWidth;

              return (
                <div
                  key={`${bar.session.id}-${bar.startMinutes}`}
                  title={`${bar.session.project?.name || 'Sem projeto'}${bar.session.description ? `: ${bar.session.description}` : ''} - ${formatDuration(bar.session.durationSeconds)}${bar.isActive ? ' (Em andamento)' : ''}${!bar.isActive ? ' (Clique para editar)' : ''}`}
                  onClick={() => handleSessionClick(bar)}
                  style={{
                    position: 'absolute',
                    top: `${top}px`,
                    left: `${left}%`,
                    width: `${width}%`,
                    height: `${Math.max(height, 20)}px`, // Mínimo de 20px para visibilidade
                    backgroundColor: color,
                    color: '#fff',
                    borderRadius: '4px',
                    padding: '0.25rem 0.4rem',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    cursor: bar.isActive ? 'not-allowed' : 'pointer',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                    border: bar.isActive ? '2px solid #fff' : '1px solid rgba(0,0,0,0.1)',
                    boxShadow: bar.isActive ? '0 0 6px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.2)',
                    zIndex: bar.isActive ? 10 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!bar.isActive) {
                      e.currentTarget.style.opacity = '0.9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  <div style={{ 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap',
                    lineHeight: '1.2',
                  }}>
                    {bar.session.project?.name || 'Sem projeto'}
                    {bar.isActive && ' ⏱️'}
                  </div>
                  {bar.session.description && height > 30 && (
                    <div style={{ 
                      fontSize: '0.65rem', 
                      opacity: 0.95, 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap',
                      marginTop: '0.1rem',
                      lineHeight: '1.2',
                    }}>
                      {bar.session.description}
                    </div>
                  )}
                  {height > 40 && (
                    <div style={{ 
                      fontSize: '0.65rem', 
                      opacity: 0.9,
                      marginTop: '0.1rem',
                    }}>
                      {formatDuration(bar.session.durationSeconds)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={editingId !== null}
        onClose={cancelEdit}
        title="Editar Sessão"
      >
        {editingId && (
          <div>
            <div className="mb-1">
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem' }}>
                Projeto:
              </label>
              <select
                value={editProjectId}
                onChange={(e) => setEditProjectId(e.target.value)}
                style={{ width: '100%', marginBottom: '0.5rem', padding: '0.3rem', fontSize: '0.8rem' }}
              >
                <option value="">Sem projeto</option>
                {projects && projects.length > 0 ? (
                  projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))
                ) : (
                  <option disabled>Carregando projetos...</option>
                )}
              </select>
            </div>
            <div className="mb-1">
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem' }}>
                Início:
              </label>
              <input
                type="datetime-local"
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
                style={{ width: '100%', marginBottom: '0.5rem', padding: '0.3rem', fontSize: '0.8rem' }}
              />
            </div>
            <div className="mb-1">
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem' }}>
                Término:
              </label>
              <input
                type="datetime-local"
                value={editEndTime}
                onChange={(e) => setEditEndTime(e.target.value)}
                style={{ width: '100%', marginBottom: '0.5rem', padding: '0.3rem', fontSize: '0.8rem' }}
              />
            </div>
            <div className="mb-1">
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem' }}>
                Descrição:
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Descrição"
                rows={3}
                style={{ width: '100%', marginBottom: '0.5rem', padding: '0.3rem', fontSize: '0.8rem', resize: 'vertical' }}
              />
            </div>
            <div className="flex gap-1" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                onClick={cancelEdit}
                style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
              >
                Cancelar
              </button>
              <button
                className="primary"
                onClick={() => editingId && handleUpdate(editingId)}
                style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
              >
                Salvar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
