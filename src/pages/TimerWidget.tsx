import { useState, useEffect, useRef } from 'react';
import { projectsApi, type Project } from '../api/projects';
import { sessionsApi, type CreateSessionData, type CreateActiveSessionData } from '../api/sessions';
import { settingsApi, type PomodoroSettings } from '../api/settings';
import { useActiveSession } from '../contexts/ActiveSessionContext';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';
import '../App.css';

type TimerMode = 'stopwatch' | 'timer' | 'pomodoro';
type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';

export default function TimerWidget() {
  const { activeSession, elapsedSeconds: contextElapsedSeconds } = useActiveSession();
  const [mode, setMode] = useState<TimerMode>('stopwatch');
  const [isRunning, setIsRunning] = useState(false);
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
  
  // Usar elapsedSeconds do contexto quando há sessão ativa, senão usar 0
  const seconds = activeSession?.active ? contextElapsedSeconds : 0;
  
  // Auto-hide message after 3 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Flag para evitar sincronização durante o processo de parar
  const isStoppingRef = useRef(false);

  // Sincronizar com a sessão ativa do contexto (SSE)
  useEffect(() => {
    // Ignorar sincronização se estamos no processo de parar
    if (isStoppingRef.current) {
      return;
    }

    if (!activeSession || !activeSession.active) {
      // Se não há sessão ativa mas o timer está rodando localmente, parar
      if (isRunning && startTime) {
        setIsRunning(false);
        setStartTime(null);
      }
      return;
    }

    // Se há uma sessão ativa, sincronizar o estado
    const sessionStartTime = new Date(activeSession.startTime!);

    // Só atualizar se o startTime local for diferente
    const localStartTimeStr = startTime?.toISOString();
    const sessionStartTimeStr = sessionStartTime.toISOString();
    
    // Não reiniciar se estamos parando ou se já está rodando com o mesmo startTime
    if ((!startTime || localStartTimeStr !== sessionStartTimeStr) && !isStoppingRef.current) {
      setMode(activeSession.mode || 'stopwatch');
      setStartTime(sessionStartTime);
      setIsRunning(true);

      if (activeSession.projectId) {
        setSelectedProjectId(activeSession.projectId);
      }

      if (activeSession.description) {
        setDescription(activeSession.description);
      }

      if (activeSession.mode === 'timer' && activeSession.targetSeconds !== null && activeSession.targetSeconds !== undefined) {
        setTargetSeconds(activeSession.targetSeconds);
      }

      if (activeSession.mode === 'pomodoro') {
        if (activeSession.pomodoroPhase) {
          setPomodoroPhase(activeSession.pomodoroPhase as PomodoroPhase);
        }
        setPomodoroCycle(activeSession.pomodoroCycle ?? 0);
        if (activeSession.targetSeconds !== null && activeSession.targetSeconds !== undefined) {
          setTargetSeconds(activeSession.targetSeconds);
        }
      }
    }
    // Nota: Os segundos agora vêm diretamente do contexto (elapsedSeconds), não precisamos calcular ou incrementar localmente
  }, [activeSession, isRunning, startTime]);

  // Carregar projetos, settings e sessão ativa
  useEffect(() => {
    async function loadData() {
      try {
        const [projectsRes, settingsRes, activeSessionRes] = await Promise.all([
          projectsApi.list(),
          settingsApi.getPomodoro(),
          sessionsApi.getActive().catch(() => ({ data: null })), // Ignora erro 404
        ]);
        const projectsList = projectsRes.data || [];
        const settings = settingsRes.data || null;
        const activeSession = activeSessionRes.data;
        
        setProjects(projectsList);
        setPomodoroSettings(settings);
        
        // Restaurar sessão ativa se existir
        if (activeSession) {
          const startTime = new Date(activeSession.startTime);
          
          setMode(activeSession.mode);
          setStartTime(startTime);
          setIsRunning(true);
          
          if (activeSession.projectId) {
            setSelectedProjectId(activeSession.projectId);
          }
          
          if (activeSession.description) {
            setDescription(activeSession.description);
          }
          
          if (activeSession.mode === 'timer' && activeSession.targetSeconds !== null) {
            setTargetSeconds(activeSession.targetSeconds);
          }
          
          if (activeSession.mode === 'pomodoro') {
            if (activeSession.pomodoroPhase) {
              setPomodoroPhase(activeSession.pomodoroPhase as PomodoroPhase);
            }
            setPomodoroCycle(activeSession.pomodoroCycle || 0);
            if (activeSession.targetSeconds !== null) {
              setTargetSeconds(activeSession.targetSeconds);
            }
          }
        }
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

  // Verificar se timer/pomodoro atingiu o alvo (usando elapsedSeconds do contexto)
  useEffect(() => {
    if (!isRunning || !activeSession?.active) {
      return;
    }

    // Auto-stop para timer e pomodoro baseado no elapsedSeconds do contexto
    if (mode === 'timer' && seconds >= targetSeconds && targetSeconds > 0) {
      handleStop();
      return;
    }
    
    if (mode === 'pomodoro') {
      const currentTarget = getPomodoroTarget();
      if (seconds >= currentTarget && currentTarget > 0) {
        handlePomodoroComplete();
        return;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, mode, targetSeconds, isRunning, activeSession?.active]);

  // Atualizar sessão ativa quando descrição ou projeto mudarem durante execução
  useEffect(() => {
    if (isRunning && startTime) {
      const updateActiveSession = async () => {
        try {
          const activeSessionData: CreateActiveSessionData = {
            startTime: startTime.toISOString(),
            mode,
          };
          
          if (selectedProjectId && selectedProjectId.trim() !== '') {
            activeSessionData.projectId = selectedProjectId.trim();
          } else {
            activeSessionData.projectId = null;
          }
          
          // Sempre enviar description, mesmo se vazio, para atualizar no backend
          const trimmedDescription = description?.trim();
          activeSessionData.description = trimmedDescription || undefined;
          
          if (mode === 'timer' || mode === 'pomodoro') {
            activeSessionData.targetSeconds = mode === 'pomodoro' ? getPomodoroTarget() : targetSeconds;
          }
          
          if (mode === 'pomodoro') {
            activeSessionData.pomodoroPhase = pomodoroPhase;
            activeSessionData.pomodoroCycle = pomodoroCycle;
          }
          
          console.log('Atualizando sessão ativa com descrição:', activeSessionData.description);
          await sessionsApi.createActive(activeSessionData);
        } catch (err) {
          console.error('Erro ao atualizar sessão ativa:', err);
        }
      };

      // Debounce para evitar muitas atualizações
      const timeoutId = setTimeout(updateActiveSession, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [isRunning, startTime, description, selectedProjectId, mode, targetSeconds, pomodoroPhase, pomodoroCycle]);

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

  async function handleStart() {
    if (mode === 'timer' && targetSeconds === 0) {
      setMessage({ text: 'Defina um tempo para o timer', type: 'error' });
      return;
    }

    const now = new Date();
    setStartTime(now);
    setIsRunning(true);
    
    // Salvar sessão ativa no backend
    try {
      const activeSessionData: CreateActiveSessionData = {
        startTime: now.toISOString(),
        mode,
      };
      
      if (selectedProjectId && selectedProjectId.trim() !== '') {
        activeSessionData.projectId = selectedProjectId.trim();
      } else {
        activeSessionData.projectId = null;
      }
      
      if (description?.trim()) {
        activeSessionData.description = description.trim();
      }
      
      if (mode === 'timer' || mode === 'pomodoro') {
        activeSessionData.targetSeconds = mode === 'pomodoro' ? getPomodoroTarget() : targetSeconds;
      }
      
      if (mode === 'pomodoro') {
        activeSessionData.pomodoroPhase = pomodoroPhase;
        activeSessionData.pomodoroCycle = pomodoroCycle;
      }
      
      await sessionsApi.createActive(activeSessionData);
    } catch (err) {
      console.error('Erro ao salvar sessão ativa:', err);
      // Não mostrar erro ao usuário, apenas logar
    }
  }


  async function handleStop() {
    if (!startTime) {
      console.warn('Não é possível salvar: startTime ausente');
      setMessage({ text: 'Erro: Tempo de início não encontrado', type: 'error' });
      return;
    }
    
    // Marcar que estamos parando para evitar sincronização
    isStoppingRef.current = true;
    
    // Salvar startTime antes de resetar
    const savedStartTime = startTime;
    const savedMode = mode;
    const savedProjectId = selectedProjectId;
    const savedDescription = description;
    const savedTargetSeconds = targetSeconds;
    const savedPomodoroPhase = pomodoroPhase;
    const savedPomodoroCycle = pomodoroCycle;
    
    // Parar o timer primeiro
    setIsRunning(false);
    setStartTime(null);
    
    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - savedStartTime.getTime()) / 1000);
    
    if (duration <= 0) {
      console.warn('Duração inválida:', duration);
      setMessage({ text: 'A sessão precisa ter duração maior que zero', type: 'error' });
      // Tentar remover sessão ativa mesmo assim
      try {
        await sessionsApi.finishActive();
      } catch (err) {
        // Ignorar erro
      }
      // Resetar descrição também
      setDescription('');
      isStoppingRef.current = false;
      return;
    }
    
    try {
      // Atualizar sessão ativa uma última vez com os valores atuais antes de finalizar
      // Isso garante que o projeto e descrição corretos sejam salvos
      try {
        const activeSessionData: CreateActiveSessionData = {
          startTime: savedStartTime.toISOString(),
          mode: savedMode,
        };
        
        if (savedProjectId && savedProjectId.trim() !== '') {
          activeSessionData.projectId = savedProjectId.trim();
        } else {
          activeSessionData.projectId = null;
        }
        
        const trimmedDescription = savedDescription?.trim();
        activeSessionData.description = trimmedDescription || undefined;
        
        if (savedMode === 'timer' || savedMode === 'pomodoro') {
          if (savedMode === 'pomodoro' && pomodoroSettings) {
            let pomodoroTarget = 0;
            if (savedPomodoroPhase === 'work') {
              pomodoroTarget = pomodoroSettings.workMinutes * 60;
            } else if (savedPomodoroPhase === 'shortBreak') {
              pomodoroTarget = pomodoroSettings.shortBreakMinutes * 60;
            } else {
              pomodoroTarget = pomodoroSettings.longBreakMinutes * 60;
            }
            activeSessionData.targetSeconds = pomodoroTarget;
          } else {
            activeSessionData.targetSeconds = savedTargetSeconds;
          }
        }
        
        if (savedMode === 'pomodoro') {
          activeSessionData.pomodoroPhase = savedPomodoroPhase;
          activeSessionData.pomodoroCycle = savedPomodoroCycle;
        }
        
        console.log('Atualizando sessão ativa antes de finalizar com projeto:', activeSessionData.projectId);
        await sessionsApi.createActive(activeSessionData);
      } catch (updateErr) {
        console.warn('Erro ao atualizar sessão ativa antes de finalizar (continuando mesmo assim):', updateErr);
      }
      
      // Finalizar sessão ativa (cria TimeSession e remove ActiveSession)
      console.log('Finalizando sessão ativa...');
      const result = await sessionsApi.finishActive();
      console.log('Resultado de finishActive:', result);
      
      if (result && result.data) {
        console.log('Sessão criada com sucesso:', result.data.id);
        setMessage({ text: 'Sessão salva com sucesso!', type: 'success' });
      } else {
        console.log('Nenhuma sessão ativa encontrada, criando manualmente...');
        // Se não havia sessão ativa, criar manualmente
        const sessionData: CreateSessionData = {
          startTime: savedStartTime.toISOString(),
          endTime: endTime.toISOString(),
          durationSeconds: duration,
          mode: savedMode,
        };
        
        if (savedProjectId && savedProjectId.trim() !== '') {
          sessionData.projectId = savedProjectId.trim();
        } else {
          sessionData.projectId = null;
        }
        
        const trimmedDescription = savedDescription?.trim();
        if (trimmedDescription) {
          sessionData.description = trimmedDescription;
        }
        
        console.log('Criando sessão manualmente:', sessionData);
        const createdSession = await sessionsApi.create(sessionData);
        console.log('Sessão criada manualmente:', createdSession);
        setMessage({ text: 'Sessão salva com sucesso!', type: 'success' });
      }
      
      // Resetar descrição
      setDescription('');
    } catch (err) {
      console.error('Erro ao salvar sessão:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar sessão';
      setMessage({ text: errorMessage, type: 'error' });
      // Resetar descrição mesmo em caso de erro
      setDescription('');
    } finally {
      // Permitir sincronização novamente após um pequeno delay
      setTimeout(() => {
        isStoppingRef.current = false;
      }, 1000);
    }
  }

  async function handlePomodoroComplete() {
    setIsRunning(false);
    
    // Salvar sessão de trabalho
    if (pomodoroPhase === 'work' && startTime) {
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      
      if (duration > 0) {
        try {
          // Atualizar sessão ativa uma última vez com os valores atuais antes de finalizar
          try {
            const activeSessionData: CreateActiveSessionData = {
              startTime: startTime.toISOString(),
              mode: 'pomodoro',
            };
            
            if (selectedProjectId && selectedProjectId.trim() !== '') {
              activeSessionData.projectId = selectedProjectId.trim();
            } else {
              activeSessionData.projectId = null;
            }
            
            const trimmedDescription = description?.trim();
            activeSessionData.description = trimmedDescription || undefined;
            activeSessionData.targetSeconds = getPomodoroTarget();
            activeSessionData.pomodoroPhase = pomodoroPhase;
            activeSessionData.pomodoroCycle = pomodoroCycle;
            
            console.log('Atualizando sessão ativa antes de finalizar (pomodoro) com projeto:', activeSessionData.projectId);
            await sessionsApi.createActive(activeSessionData);
          } catch (updateErr) {
            console.warn('Erro ao atualizar sessão ativa antes de finalizar (continuando mesmo assim):', updateErr);
          }
          
          // Tentar finalizar sessão ativa primeiro
          await sessionsApi.finishActive();
        } catch (err) {
          // Se não houver sessão ativa, criar manualmente
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
          
          await sessionsApi.create(sessionData);
        }
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
        setTimeout(async () => {
          const now = new Date();
          const nextPhase = newCycle % pomodoroSettings.longBreakInterval === 0 ? 'longBreak' : 'shortBreak';
          setStartTime(now);
          setIsRunning(true);
          
          // Salvar sessão ativa para a pausa
          try {
            const activeSessionData: CreateActiveSessionData = {
              startTime: now.toISOString(),
              mode: 'pomodoro',
              projectId: selectedProjectId || null,
              description: description || undefined,
              targetSeconds: nextPhase === 'longBreak' 
                ? pomodoroSettings.longBreakMinutes * 60 
                : pomodoroSettings.shortBreakMinutes * 60,
              pomodoroPhase: nextPhase,
              pomodoroCycle: newCycle,
            };
            await sessionsApi.createActive(activeSessionData);
          } catch (err) {
            console.error('Erro ao salvar sessão ativa:', err);
          }
        }, 1000);
      }
    } else {
      // Voltar para trabalho
      setPomodoroPhase('work');
      setTargetSeconds(pomodoroSettings?.workMinutes || 25 * 60);
      setStartTime(null);
      
      // Remover sessão ativa se existir
      try {
        await sessionsApi.finishActive();
      } catch (err) {
        // Ignorar erro se não houver sessão ativa
      }
    }
  }

  function handleModeChange(newMode: TimerMode) {
    if (isRunning) {
      setConfirmDialog({ isOpen: true, pendingMode: newMode });
      return;
    }
    
    applyModeChange(newMode);
  }

  async function applyModeChange(newMode: TimerMode) {
    // Se houver sessão ativa, removê-la ao mudar de modo
    try {
      await sessionsApi.finishActive();
    } catch (err) {
      // Ignorar erro se não houver sessão ativa
    }
    
    setMode(newMode);
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

  async function handleRefresh() {
    setLoading(true);
    try {
      const [projectsRes, settingsRes, activeSessionRes] = await Promise.all([
        projectsApi.list(),
        settingsApi.getPomodoro(),
        sessionsApi.getActive().catch(() => ({ data: null })),
      ]);
      const projectsList = projectsRes.data || [];
      const settings = settingsRes.data || null;
      const activeSession = activeSessionRes.data;
      
      setProjects(projectsList);
      setPomodoroSettings(settings);
      
      if (activeSession) {
        const startTime = new Date(activeSession.startTime);
        
        setMode(activeSession.mode);
        setStartTime(startTime);
        setIsRunning(true);
        
        if (activeSession.projectId) {
          setSelectedProjectId(activeSession.projectId);
        }
        
        if (activeSession.description) {
          setDescription(activeSession.description);
        }
        
        if (activeSession.mode === 'timer' && activeSession.targetSeconds !== null) {
          setTargetSeconds(activeSession.targetSeconds);
        }
        
        if (activeSession.mode === 'pomodoro') {
          if (activeSession.pomodoroPhase) {
            setPomodoroPhase(activeSession.pomodoroPhase as PomodoroPhase);
          }
          setPomodoroCycle(activeSession.pomodoroCycle || 0);
          if (activeSession.targetSeconds !== null) {
            setTargetSeconds(activeSession.targetSeconds);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao recarregar dados:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="widget-container with-timer-space">Carregando...</div>;
  }

  const displaySeconds = mode === 'timer' || mode === 'pomodoro' 
    ? Math.max(0, (mode === 'pomodoro' ? getPomodoroTarget() : targetSeconds) - seconds)
    : seconds;

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
        <h2 className="widget-title" style={{ fontSize: '1rem', marginBottom: 0 }}>Time Tracker</h2>
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
      
      {/* Mode selector */}
      <div className="flex gap-1 mb-1" style={{ width: '100%' }}>
        <button
          onClick={() => handleModeChange('stopwatch')}
          className={mode === 'stopwatch' ? 'primary' : ''}
          style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
        >
          Stopwatch
        </button>
        <button
          onClick={() => handleModeChange('timer')}
          className={mode === 'timer' ? 'primary' : ''}
          style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
        >
          Timer
        </button>
        <button
          onClick={() => handleModeChange('pomodoro')}
          className={mode === 'pomodoro' ? 'primary' : ''}
          style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
        >
          Pomodoro
        </button>
      </div>

      {/* Pomodoro info */}
      {mode === 'pomodoro' && (
        <div className="card mb-1" style={{ padding: '0.5rem' }}>
          <p style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>
            Fase: {pomodoroPhase === 'work' ? 'Trabalho' : pomodoroPhase === 'shortBreak' ? 'Pausa Curta' : 'Pausa Longa'}
          </p>
          <p style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Ciclo: {pomodoroCycle}</p>
          {pomodoroSettings && (
            <p style={{ fontSize: '0.8rem', marginBottom: 0 }}>
              Próxima pausa longa: {pomodoroSettings.longBreakInterval - (pomodoroCycle % pomodoroSettings.longBreakInterval)} ciclos
            </p>
          )}
        </div>
      )}

      {/* Timer display */}
      <div className="card text-center mb-1" style={{ padding: '0.5rem' }}>
        <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'monospace', lineHeight: '1.2' }}>
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
              style={{ width: '80px', textAlign: 'center', padding: '0.3rem', fontSize: '0.8rem' }}
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-1 mb-1">
        {!isRunning ? (
          <button className="primary" onClick={handleStart} style={{ flex: 1, width: '100%', padding: '0.4rem' }}>
            Iniciar
          </button>
        ) : (
          <button className="danger" onClick={handleStop} style={{ flex: 1, width: '100%', padding: '0.4rem' }}>
            Parar
          </button>
        )}
      </div>

      {/* Project and description */}
      <div className="card" style={{ padding: '0.5rem' }}>
        <div className="mb-1">
          <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Projeto:</label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            style={{ padding: '0.3rem', fontSize: '0.8rem' }}
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
          <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Descrição:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="O que você está fazendo?"
            rows={1}
            style={{ padding: '0.3rem', fontSize: '0.8rem', resize: 'vertical' }}
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

