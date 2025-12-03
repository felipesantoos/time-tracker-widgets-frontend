import { useState, useEffect } from 'react';
import { sessionsApi, type TimeSession } from '../api/sessions';
import { projectsApi, type Project } from '../api/projects';
import '../App.css';

export default function SessionsWidget() {
  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProjectId, setFilterProjectId] = useState<string>('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editProjectId, setEditProjectId] = useState<string>('');
  const [editStartTime, setEditStartTime] = useState<string>('');
  const [editEndTime, setEditEndTime] = useState<string>('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    loadProjects();
    loadSessions();
  }, [filterProjectId, filterFrom, filterTo]);

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
      const res = await sessionsApi.list({
        projectId: filterProjectId || undefined,
        from: filterFrom || undefined,
        to: filterTo || undefined,
        limit: 100,
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

  function startEdit(session: TimeSession) {
    setEditingId(session.id);
    setEditDescription(session.description || '');
    setEditProjectId(session.projectId || '');
    
    // Converter datas para formato de input datetime-local
    const startDate = new Date(session.startTime);
    const endDate = new Date(session.endTime);
    setEditStartTime(startDate.toISOString().slice(0, 16));
    setEditEndTime(endDate.toISOString().slice(0, 16));
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
        updateData.startTime = new Date(editStartTime).toISOString();
      }

      if (editEndTime) {
        updateData.endTime = new Date(editEndTime).toISOString();
      }

      await sessionsApi.update(id, updateData);
      cancelEdit();
      setMessage({ text: 'Sessão atualizada com sucesso!', type: 'success' });
      loadSessions();
    } catch (err) {
      console.error('Erro ao atualizar sessão:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar sessão';
      setMessage({ text: errorMessage, type: 'error' });
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Tem certeza que deseja deletar esta sessão?')) {
      return;
    }

    try {
      await sessionsApi.delete(id);
      setMessage({ text: 'Sessão deletada com sucesso!', type: 'success' });
      loadSessions();
    } catch (err) {
      console.error('Erro ao deletar sessão:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao deletar sessão';
      setMessage({ text: errorMessage, type: 'error' });
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

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="widget-container">
      <h2>Sessões</h2>

      {message && (
        <div
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            borderRadius: '4px',
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
            fontSize: '0.9rem',
          }}
        >
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="card mb-2">
        <div className="mb-1">
          <label>Projeto:</label>
          <select
            value={filterProjectId}
            onChange={(e) => setFilterProjectId(e.target.value)}
          >
            <option value="">Todos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-2">
          <div>
            <label>De:</label>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
            />
          </div>
          <div>
            <label>Até:</label>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : !sessions || sessions.length === 0 ? (
        <div className="card">
          <p>Nenhuma sessão encontrada.</p>
        </div>
      ) : (
        <div>
          {sessions.map((session) => (
            <div key={session.id} className="card mb-1">
              {editingId === session.id ? (
                <div>
                  <div className="mb-1">
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                      Projeto:
                    </label>
                    <select
                      value={editProjectId}
                      onChange={(e) => setEditProjectId(e.target.value)}
                      style={{ width: '100%', marginBottom: '0.75rem' }}
                    >
                      <option value="">Sem projeto</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-1">
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                      Início:
                    </label>
                    <input
                      type="datetime-local"
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                      style={{ width: '100%', marginBottom: '0.75rem' }}
                    />
                  </div>
                  <div className="mb-1">
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                      Término:
                    </label>
                    <input
                      type="datetime-local"
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                      style={{ width: '100%', marginBottom: '0.75rem' }}
                    />
                  </div>
                  <div className="mb-1">
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                      Descrição:
                    </label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Descrição"
                      rows={2}
                      style={{ width: '100%', marginBottom: '0.75rem' }}
                    />
                  </div>
                  <div className="flex gap-1">
                    <button
                      className="primary"
                      onClick={() => handleUpdate(session.id)}
                    >
                      Salvar
                    </button>
                    <button onClick={cancelEdit}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex-between mb-1 gap-1">
                    <div className="flex gap-1" style={{ alignItems: 'center' }}>
                      {session.project ? (
                        <>
                          <div
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '4px',
                              backgroundColor: session.project.color,
                            }}
                          />
                          <strong>{session.project.name}</strong>
                        </>
                      ) : (
                        <strong style={{ color: '#999' }}>Sem projeto</strong>
                      )}
                      <span style={{ fontSize: '0.85rem', color: '#666' }}>
                        {formatDate(session.startTime)}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(session)}>Editar</button>
                      <button
                        className="danger"
                        onClick={() => handleDelete(session.id)}
                      >
                        Deletar
                      </button>
                    </div>
                  </div>
                  {session.description && (
                    <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                      {session.description}
                    </p>
                  )}
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    <span>
                      {formatDuration(session.durationSeconds)} • {session.mode}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

