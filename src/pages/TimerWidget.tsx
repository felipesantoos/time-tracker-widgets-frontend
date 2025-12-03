import { useState, useEffect, useRef } from 'react';
import { projectsApi, type Project } from '../api/projects';
import { sessionsApi, type CreateSessionData } from '../api/sessions';
import { settingsApi, type PomodoroSettings } from '../api/settings';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';
import '../App.css';

type TimerMode = 'stopwatch' | 'timer' | 'pomodoro';
type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';

export default function TimerWidget() {
  const [mode, setMode] = useState<TimerMode>('stopwatch');
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [targetSeconds, setTargetSeconds] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [description, setDescription] = useState('');
  
  // Pomodoro state
  const [pomodoroSettings, setPomodoroSettings] = useState<PomodoroSettings | null>(null);
  const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>('work');
  const [pomodoroCycle, setPomodoroCycle] = useState(0);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; pendingMode: TimerMode | null }>({
    isOpen: false,
    pendingMode: null,
  });
  
  const intervalRef = useRef<number | null>(null);
  
  // Auto-hide message after 3 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Carregar projetos e settings
  useEffect(() => {
    async function loadData() {
      try {
        const [projectsRes, settingsRes] = await Promise.all([
          projectsApi.list(),
          settingsApi.getPomodoro(),
        ]);
        const projectsList = projectsRes.data || [];
        const settings = settingsRes.data || null;
        
        setProjects(projectsList);
        setPomodoroSettings(settings);
        // Não selecionar projeto automaticamente - usuário escolhe manualmente
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setProjects([]);
        setPomodoroSettings(null);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setSeconds((prev) => {
          const newSeconds = prev + 1;
          
          // Auto-stop para timer e pomodoro
          if (mode === 'timer' && newSeconds >= targetSeconds) {
            handleStop();
            return targetSeconds;
          }
          
          if (mode === 'pomodoro') {
            const currentTarget = getPomodoroTarget();
            if (newSeconds >= currentTarget) {
              handlePomodoroComplete();
              return currentTarget;
            }
          }
          
          return newSeconds;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, mode, targetSeconds]);

  function getPomodoroTarget(): number {
    if (!pomodoroSettings) return 0;
    
    if (pomodoroPhase === 'work') {
      return pomodoroSettings.workMinutes * 60;
    } else if (pomodoroPhase === 'shortBreak') {
      return pomodoroSettings.shortBreakMinutes * 60;
    } else {
      return pomodoroSettings.longBreakMinutes * 60;
    }
  }

  function formatTime(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function handleStart() {
    if (mode === 'timer' && targetSeconds === 0) {
      setMessage({ text: 'Defina um tempo para o timer', type: 'error' });
      return;
    }

    setStartTime(new Date());
    setIsRunning(true);
    
    if (mode === 'stopwatch') {
      setSeconds(0);
    } else if (mode === 'timer') {
      setSeconds(0);
    } else if (mode === 'pomodoro') {
      setSeconds(0);
    }
  }


  async function handleStop() {
    if (!startTime) {
      console.warn('Não é possível salvar: startTime ausente');
      setMessage({ text: 'Erro: Tempo de início não encontrado', type: 'error' });
      return;
    }
    
    // Parar o timer primeiro
    setIsRunning(false);
    
    // Limpar o interval imediatamente
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    
    if (duration <= 0) {
      console.warn('Duração inválida:', duration);
      setMessage({ text: 'A sessão precisa ter duração maior que zero', type: 'error' });
      // Resetar mesmo se a duração for inválida
      setSeconds(0);
      setStartTime(null);
      setDescription('');
      return;
    }
    
    try {
      const sessionData: CreateSessionData = {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        durationSeconds: duration,
        mode,
      };
      
      // Adicionar projectId apenas se um projeto foi selecionado
      if (selectedProjectId && selectedProjectId.trim() !== '') {
        sessionData.projectId = selectedProjectId.trim();
      } else {
        sessionData.projectId = null;
      }
      
      // Adicionar description apenas se não estiver vazio
      const trimmedDescription = description?.trim();
      if (trimmedDescription) {
        sessionData.description = trimmedDescription;
      }
      
      console.log('Enviando sessão:', sessionData);
      await sessionsApi.create(sessionData);
      setMessage({ text: 'Sessão salva com sucesso!', type: 'success' });
      
      // Resetar estado
      setSeconds(0);
      setStartTime(null);
      setDescription('');
    } catch (err) {
      console.error('Erro ao salvar sessão:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar sessão';
      setMessage({ text: errorMessage, type: 'error' });
      // Resetar mesmo em caso de erro
      setSeconds(0);
      setStartTime(null);
      setDescription('');
    }
  }

  function handlePomodoroComplete() {
    setIsRunning(false);
    
    // Salvar sessão de trabalho
    if (pomodoroPhase === 'work' && startTime) {
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      
      if (duration > 0) {
        const sessionData: CreateSessionData = {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          durationSeconds: duration,
          mode: 'pomodoro',
        };
        
        if (selectedProjectId && selectedProjectId.trim() !== '') {
          sessionData.projectId = selectedProjectId.trim();
        } else {
          sessionData.projectId = null;
        }
        
        if (description?.trim()) {
          sessionData.description = description.trim();
        }
        
        sessionsApi.create(sessionData).catch(console.error);
      }
    }
    
    // Avançar para próxima fase
    if (pomodoroPhase === 'work') {
      const newCycle = pomodoroCycle + 1;
      setPomodoroCycle(newCycle);
      
      // Verificar se é hora da pausa longa
      if (pomodoroSettings && newCycle % pomodoroSettings.longBreakInterval === 0) {
        setPomodoroPhase('longBreak');
        setTargetSeconds(pomodoroSettings.longBreakMinutes * 60);
      } else {
        setPomodoroPhase('shortBreak');
        setTargetSeconds(pomodoroSettings?.shortBreakMinutes || 5 * 60);
      }
      
      if (pomodoroSettings?.autoStartBreak) {
        setTimeout(() => {
          setStartTime(new Date());
          setIsRunning(true);
          setSeconds(0);
        }, 1000);
      }
    } else {
      // Voltar para trabalho
      setPomodoroPhase('work');
      setTargetSeconds(pomodoroSettings?.workMinutes || 25 * 60);
      setStartTime(null);
      setSeconds(0);
    }
  }

  function handleModeChange(newMode: TimerMode) {
    if (isRunning) {
      setConfirmDialog({ isOpen: true, pendingMode: newMode });
      return;
    }
    
    applyModeChange(newMode);
  }

  function applyModeChange(newMode: TimerMode) {
    setMode(newMode);
    setSeconds(0);
    setPomodoroPhase('work');
    setPomodoroCycle(0);
    
    if (newMode === 'timer') {
      setTargetSeconds(25 * 60); // Default 25 min
    } else if (newMode === 'pomodoro' && pomodoroSettings) {
      setTargetSeconds(pomodoroSettings.workMinutes * 60);
    }
  }

  async function handleModeChangeConfirm() {
    if (confirmDialog.pendingMode) {
      const pendingMode = confirmDialog.pendingMode;
      setConfirmDialog({ isOpen: false, pendingMode: null });
      await handleStop();
      applyModeChange(pendingMode);
    } else {
      setConfirmDialog({ isOpen: false, pendingMode: null });
    }
  }

  function handleModeChangeCancel() {
    setConfirmDialog({ isOpen: false, pendingMode: null });
  }

  if (loading) {
    return <div className="widget-container">Carregando...</div>;
  }

  const displaySeconds = mode === 'timer' || mode === 'pomodoro' 
    ? Math.max(0, (mode === 'pomodoro' ? getPomodoroTarget() : targetSeconds) - seconds)
    : seconds;

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

      <h2 className="widget-title" style={{ textAlign: 'center' }}>Time Tracker</h2>
      
      {/* Mode selector */}
      <div className="flex gap-1 mb-2" style={{ width: '100%' }}>
        <button
          onClick={() => handleModeChange('stopwatch')}
          className={mode === 'stopwatch' ? 'primary' : ''}
          style={{ flex: 1 }}
        >
          Stopwatch
        </button>
        <button
          onClick={() => handleModeChange('timer')}
          className={mode === 'timer' ? 'primary' : ''}
          style={{ flex: 1 }}
        >
          Timer
        </button>
        <button
          onClick={() => handleModeChange('pomodoro')}
          className={mode === 'pomodoro' ? 'primary' : ''}
          style={{ flex: 1 }}
        >
          Pomodoro
        </button>
      </div>

      {/* Pomodoro info */}
      {mode === 'pomodoro' && (
        <div className="card mb-2">
          <p>
            Fase: {pomodoroPhase === 'work' ? 'Trabalho' : pomodoroPhase === 'shortBreak' ? 'Pausa Curta' : 'Pausa Longa'}
          </p>
          <p>Ciclo: {pomodoroCycle}</p>
          {pomodoroSettings && (
            <p>
              Próxima pausa longa em: {pomodoroSettings.longBreakInterval - (pomodoroCycle % pomodoroSettings.longBreakInterval)} ciclos
            </p>
          )}
        </div>
      )}

      {/* Timer display */}
      <div className="card text-center mb-2">
        <div style={{ fontSize: '3rem', fontWeight: 'bold', fontFamily: 'monospace' }}>
          {formatTime(displaySeconds)}
        </div>
        {mode === 'timer' && (
          <div className="mt-1">
            <input
              type="number"
              placeholder="Minutos"
              value={Math.floor(targetSeconds / 60)}
              onChange={(e) => setTargetSeconds(parseInt(e.target.value) * 60 || 0)}
              disabled={isRunning}
              style={{ width: '100px', textAlign: 'center' }}
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-1 mb-2">
        {!isRunning ? (
          <button className="primary" onClick={handleStart} style={{ flex: 1, width: '100%' }}>
            Iniciar
          </button>
        ) : (
          <button className="danger" onClick={handleStop} style={{ flex: 1, width: '100%' }}>
            Parar
          </button>
        )}
      </div>

      {/* Project and description */}
      <div className="card">
        <div className="mb-1">
          <label>Projeto:</label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            disabled={isRunning}
          >
            <option value="">Selecione...</option>
            {projects && projects.length > 0 ? (
              projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))
            ) : (
              <option disabled>Nenhum projeto disponível</option>
            )}
          </select>
        </div>
        <div>
          <label>Descrição (opcional):</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="O que você está fazendo?"
            rows={2}
          />
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        message="Tem certeza? A sessão atual será interrompida."
        onConfirm={handleModeChangeConfirm}
        onCancel={handleModeChangeCancel}
        confirmText="Confirmar"
        cancelText="Cancelar"
      />
    </div>
  );
}

