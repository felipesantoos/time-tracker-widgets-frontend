import { useState, useEffect } from 'react';
import { projectsApi, type Project } from '../api/projects';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';
import Modal from '../components/Modal';
import '../App.css';

export default function ProjectsWidget() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#007bff');
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#007bff');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; projectId: string | null }>({
    isOpen: false,
    projectId: null,
  });

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const res = await projectsApi.list();
      const projectsList = res.data || [];
      setProjects(projectsList);
    } catch (err) {
      console.error('Erro ao carregar projetos:', err);
      setMessage({ text: 'Erro ao carregar projetos', type: 'error' });
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) {
      setMessage({ text: 'Nome é obrigatório', type: 'error' });
      return;
    }

    try {
      await projectsApi.create({ name: newName, color: newColor });
      setNewName('');
      setNewColor('#007bff');
      setShowForm(false);
      setMessage({ text: 'Projeto criado com sucesso!', type: 'success' });
      loadProjects();
    } catch (err) {
      console.error('Erro ao criar projeto:', err);
      setMessage({ text: 'Erro ao criar projeto', type: 'error' });
    }
  }

  function startEdit(project: Project) {
    setEditingId(project.id);
    setEditName(project.name);
    setEditColor(project.color);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
    setEditColor('#007bff');
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) {
      setMessage({ text: 'Nome é obrigatório', type: 'error' });
      return;
    }

    try {
      await projectsApi.update(id, { name: editName, color: editColor });
      cancelEdit();
      setMessage({ text: 'Projeto atualizado com sucesso!', type: 'success' });
      loadProjects();
    } catch (err) {
      console.error('Erro ao atualizar projeto:', err);
      setMessage({ text: 'Erro ao atualizar projeto', type: 'error' });
    }
  }

  function handleDeleteClick(id: string) {
    setConfirmDialog({ isOpen: true, projectId: id });
  }

  async function handleDeleteConfirm() {
    if (!confirmDialog.projectId) return;

    try {
      await projectsApi.delete(confirmDialog.projectId);
      setMessage({ text: 'Projeto deletado com sucesso!', type: 'success' });
      setConfirmDialog({ isOpen: false, projectId: null });
      loadProjects();
    } catch (err) {
      console.error('Erro ao deletar projeto:', err);
      setMessage({ text: 'Erro ao deletar projeto', type: 'error' });
      setConfirmDialog({ isOpen: false, projectId: null });
    }
  }

  function handleDeleteCancel() {
    setConfirmDialog({ isOpen: false, projectId: null });
  }

  async function handleRefresh() {
    await loadProjects();
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

      <div className="flex mb-1" style={{ alignItems: 'center', gap: '0.5rem' }}>
        <h2 className="widget-title" style={{ fontSize: '1rem', marginBottom: 0 }}>Projetos</h2>
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
        <button
          className="primary"
          onClick={() => setShowForm(true)}
          style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
        >
          + Novo
        </button>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setNewName('');
          setNewColor('#007bff');
        }}
        title="Criar Projeto"
      >
        <div className="mb-1">
          <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Nome:</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do projeto"
            style={{ padding: '0.3rem', fontSize: '0.8rem' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreate();
              }
            }}
          />
        </div>
        <div className="mb-1">
          <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Cor:</label>
          <div className="flex gap-1" style={{ alignItems: 'center' }}>
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              style={{ width: '40px', height: '30px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.75rem', color: '#666' }}>{newColor}</span>
          </div>
        </div>
        <div className="flex gap-1" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button
            onClick={() => {
              setShowForm(false);
              setNewName('');
              setNewColor('#007bff');
            }}
            style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
          >
            Cancelar
          </button>
          <button
            className="primary"
            onClick={handleCreate}
            style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
          >
            Criar
          </button>
        </div>
      </Modal>

      <div>
        {!projects || projects.length === 0 ? (
          <div className="card" style={{ padding: '0.5rem' }}>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>Nenhum projeto criado ainda.</p>
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="card mb-1" style={{ padding: '0.5rem' }}>
              <div className="flex-between gap-1">
                <div className="flex gap-1" style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '3px',
                      backgroundColor: project.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</span>
                </div>
                <div className="flex gap-1" style={{ flexShrink: 0 }}>
                  <button onClick={() => startEdit(project)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Editar</button>
                  <button
                    className="danger"
                    onClick={() => handleDeleteClick(project.id)}
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                  >
                    Deletar
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={editingId !== null}
        onClose={cancelEdit}
        title="Editar Projeto"
      >
        {editingId && (
          <div>
            <div className="mb-1">
              <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Nome:</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nome do projeto"
                style={{ padding: '0.3rem', fontSize: '0.8rem' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && editingId) {
                    handleUpdate(editingId);
                  }
                }}
              />
            </div>
            <div className="mb-1">
              <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Cor:</label>
              <div className="flex gap-1" style={{ alignItems: 'center' }}>
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  style={{ width: '40px', height: '30px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.75rem', color: '#666' }}>{editColor}</span>
              </div>
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

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        message="Tem certeza que deseja deletar este projeto?"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmText="Deletar"
        cancelText="Cancelar"
      />
    </div>
  );
}

