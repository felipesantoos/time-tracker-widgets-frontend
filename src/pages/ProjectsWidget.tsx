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
      alert('Erro ao carregar projetos');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) {
      alert('Nome é obrigatório');
      return;
    }

    try {
      await projectsApi.create({ name: newName, color: newColor });
      setNewName('');
      setNewColor('#007bff');
      setShowForm(false);
      loadProjects();
    } catch (err) {
      console.error('Erro ao criar projeto:', err);
      alert('Erro ao criar projeto');
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
      alert('Nome é obrigatório');
      return;
    }

    try {
      await projectsApi.update(id, { name: editName, color: editColor });
      cancelEdit();
      loadProjects();
    } catch (err) {
      console.error('Erro ao atualizar projeto:', err);
      alert('Erro ao atualizar projeto');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja deletar este projeto?')) {
      return;
    }

    try {
      await projectsApi.delete(id);
      loadProjects();
    } catch (err) {
      console.error('Erro ao deletar projeto:', err);
      alert('Erro ao deletar projeto');
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
                <div className="flex-between">
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

