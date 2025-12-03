import { useState } from 'react';
import { useActiveSession } from '../contexts/ActiveSessionContext';
import { sessionsApi } from '../api/sessions';
import '../App.css';

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function ActiveTimerBar() {
  const { activeSession, elapsedSeconds } = useActiveSession();
  const [isStopping, setIsStopping] = useState(false);

  if (!activeSession || !activeSession.active) {
    return null;
  }

  const handleStop = async () => {
    if (isStopping) return;
    
    setIsStopping(true);
    try {
      await sessionsApi.finishActive();
    } catch (err) {
      console.error('Erro ao parar sessão:', err);
      // Ainda mostra erro, mas não bloqueia a UI
    } finally {
      setIsStopping(false);
    }
  };

  const modeLabels = {
    stopwatch: 'Stopwatch',
    timer: 'Timer',
    pomodoro: 'Pomodoro',
  };

  return (
    <div className="active-timer-bar">
      <div className="active-timer-bar-content">
        <div className="active-timer-bar-info">
          <div className="active-timer-bar-time">
            {formatTime(elapsedSeconds)}
          </div>
          <div className="active-timer-bar-details">
            <span className="active-timer-bar-mode">{modeLabels[activeSession.mode || 'stopwatch']}</span>
            {activeSession.project && (
              <div className="active-timer-bar-project">
                <div
                  className="active-timer-bar-project-color"
                  style={{ backgroundColor: activeSession.project.color }}
                />
                <span className="active-timer-bar-project-name">
                  {activeSession.project.name}
                </span>
              </div>
            )}
            {activeSession.description && (
              <span className="active-timer-bar-description" title={activeSession.description}>
                {activeSession.description.length > 30 
                  ? `${activeSession.description.substring(0, 30)}...` 
                  : activeSession.description}
              </span>
            )}
          </div>
        </div>
        <button
          className="active-timer-bar-stop danger"
          onClick={handleStop}
          disabled={isStopping}
        >
          {isStopping ? 'Parando...' : 'Parar'}
        </button>
      </div>
    </div>
  );
}

