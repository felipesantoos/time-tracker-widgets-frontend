import { useState, useEffect } from 'react';
import { sessionsApi, type TimeSession } from '../api/sessions';
import { projectsApi, type Project } from '../api/projects';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';
import Modal from '../components/Modal';
import { formatDateToLocal, utcToLocalDatetime, localDatetimeToUtc } from '../utils/dateUtils';
import '../App.css';

export default function SessionsWidget() {
  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProjectId, setFilterProjectId] = useState<string>('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editProjectId, setEditProjectId] = useState<string>('');
  const [editStartTime, setEditStartTime] = useState<string>('');
  const [editEndTime, setEditEndTime] = useState<string>('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; sessionId: string | null }>({
    isOpen: false,
    sessionId: null,
  });
  
  const ITEMS_PER_PAGE = 10;

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
    // Resetar para página 1 quando os filtros mudarem
    setCurrentPage(1);
  }, [filterProjectId, filterFrom, filterTo]);

  useEffect(() => {
    loadSessions();
  }, [filterProjectId, filterFrom, filterTo, currentPage]);

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
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      });
      const sessionsList = res.data || [];
      setSessions(sessionsList);
      
      // Atualizar informações de paginação
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Erro ao carregar sessões:', err);
      setMessage({ text: 'Erro ao carregar sessões', type: 'error' });
      setSessions([]);
      setPagination(null);
    } finally {
      setLoading(false);
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
      loadSessions();
    } catch (err) {
      console.error('Erro ao atualizar sessão:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar sessão';
      setMessage({ text: errorMessage, type: 'error' });
    }
  }

  function handleDeleteClick(id: string) {
    setConfirmDialog({ isOpen: true, sessionId: id });
  }

  async function handleDeleteConfirm() {
    if (!confirmDialog.sessionId) return;

    try {
      await sessionsApi.delete(confirmDialog.sessionId);
      setMessage({ text: 'Sessão deletada com sucesso!', type: 'success' });
      setConfirmDialog({ isOpen: false, sessionId: null });
      loadSessions();
    } catch (err) {
      console.error('Erro ao deletar sessão:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao deletar sessão';
      setMessage({ text: errorMessage, type: 'error' });
      setConfirmDialog({ isOpen: false, sessionId: null });
    }
  }

  function handleDeleteCancel() {
    setConfirmDialog({ isOpen: false, sessionId: null });
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
    return formatDateToLocal(dateString);
  }

  async function handleRefresh() {
    await Promise.all([loadProjects(), loadSessions()]);
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

      <div className="flex mb-1" style={{ alignItems: 'center', gap: '0.5rem' }}>
        <h2 className="widget-title" style={{ fontSize: '1rem', marginBottom: 0 }}>Sessões</h2>
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

      {/* Filters */}
      <div className="card mb-1" style={{ padding: '0.5rem' }}>
        <div className="mb-1">
          <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Projeto:</label>
          <select
            value={filterProjectId}
            onChange={(e) => setFilterProjectId(e.target.value)}
            style={{ padding: '0.3rem', fontSize: '0.8rem' }}
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
            <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>De:</label>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              style={{ padding: '0.3rem', fontSize: '0.8rem' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Até:</label>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              style={{ padding: '0.3rem', fontSize: '0.8rem' }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: '0.85rem', padding: '0.5rem' }}>Carregando...</div>
      ) : !sessions || sessions.length === 0 ? (
        <div className="card" style={{ padding: '0.5rem' }}>
          <p style={{ fontSize: '0.85rem', margin: 0 }}>Nenhuma sessão encontrada.</p>
        </div>
      ) : (
        <>
          <div>
            {sessions.map((session) => (
              <div key={session.id} className="card mb-1" style={{ padding: '0.5rem' }}>
                <div>
                  <div className="flex-between mb-1 gap-1">
                    <div className="flex gap-1" style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
                      {session.project ? (
                        <>
                          <div
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '3px',
                              backgroundColor: session.project.color,
                              flexShrink: 0,
                            }}
                          />
                          <strong style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.project.name}</strong>
                        </>
                      ) : (
                        <strong style={{ color: '#999', fontSize: '0.85rem' }}>Sem projeto</strong>
                      )}
                      <span style={{ fontSize: '0.75rem', color: '#666', marginLeft: '0.25rem' }}>
                        {formatDate(session.startTime)}
                      </span>
                    </div>
                    <div className="flex gap-1" style={{ flexShrink: 0 }}>
                      <button onClick={() => startEdit(session)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Editar</button>
                      <button
                        className="danger"
                        onClick={() => handleDeleteClick(session.id)}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        Deletar
                      </button>
                    </div>
                  </div>
                  {session.description && (
                    <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {session.description}
                    </p>
                  )}
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>
                    <span>
                      {formatDuration(session.durationSeconds)} • {session.mode}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

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
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
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
          
          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="card mt-1" style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '0.5rem',
              flexWrap: 'wrap',
              gap: '0.4rem'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>
                {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, pagination.total)}/{pagination.total}
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1,
                  }}
                >
                  Anterior
                </button>
                <span style={{ fontSize: '0.75rem', color: '#666' }}>
                  {currentPage}/{pagination.totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                  disabled={currentPage === pagination.totalPages}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    cursor: currentPage === pagination.totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === pagination.totalPages ? 0.5 : 1,
                  }}
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        message="Tem certeza que deseja deletar esta sessão?"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmText="Deletar"
        cancelText="Cancelar"
      />
    </div>
  );
}

