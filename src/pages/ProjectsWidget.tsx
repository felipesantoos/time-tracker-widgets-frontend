import { useState, useEffect } from 'react';
import { projectsApi, type Project } from '../api/projects';
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

  async function handleDelete(id: string) {
    if (!window.confirm('Tem certeza que deseja deletar este projeto?')) {
      return;
    }

    try {
      await projectsApi.delete(id);
      setMessage({ text: 'Projeto deletado com sucesso!', type: 'success' });
      loadProjects();
    } catch (err) {
      console.error('Erro ao deletar projeto:', err);
      setMessage({ text: 'Erro ao deletar projeto', type: 'error' });
    }
  }

  if (loading) {
    return <div className="widget-container">Carregando...</div>;
  }

  return (
    <div className="widget-container">
      <div className="flex-between mb-2">
        <h2>Projetos</h2>
        <button
          className="primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancelar' : '+ Novo Projeto'}
        </button>
      </div>

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

      {showForm && (
        <div className="card mb-2">
          <h3>Criar Projeto</h3>
          <div className="mb-1">
            <label>Nome:</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome do projeto"
            />
          </div>
          <div className="mb-1">
            <label>Cor:</label>
            <div className="flex gap-1" style={{ alignItems: 'center' }}>
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                style={{ width: '50px', height: '40px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.9rem', color: '#666' }}>{newColor}</span>
            </div>
          </div>
          <button className="primary" onClick={handleCreate}>
            Criar
          </button>
        </div>
      )}

      <div>
        {!projects || projects.length === 0 ? (
          <div className="card">
            <p>Nenhum projeto criado ainda.</p>
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="card mb-1">
              {editingId === project.id ? (
                <div>
                  <div className="mb-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div className="mb-1">
                    <label>Cor:</label>
                    <div className="flex gap-1" style={{ alignItems: 'center' }}>
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        style={{ width: '50px', height: '40px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.9rem', color: '#666' }}>{editColor}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      className="primary"
                      onClick={() => handleUpdate(project.id)}
                    >
                      Salvar
                    </button>
                    <button onClick={cancelEdit}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="flex-between gap-1">
                  <div className="flex gap-1" style={{ alignItems: 'center' }}>
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        backgroundColor: project.color,
                      }}
                    />
                    <span>{project.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(project)}>Editar</button>
                    <button
                      className="danger"
                      onClick={() => handleDelete(project.id)}
                    >
                      Deletar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

