import { useState, useEffect, useRef } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export interface ActiveSessionStreamData {
  active: boolean;
  id?: string;
  startTime?: string;
  mode?: 'stopwatch' | 'timer' | 'pomodoro';
  projectId?: string | null;
  description?: string;
  targetSeconds?: number | null;
  pomodoroPhase?: 'work' | 'shortBreak' | 'longBreak' | null;
  pomodoroCycle?: number;
  project?: {
    id: string;
    name: string;
    color: string;
  } | null;
  elapsedSeconds: number;
  error?: string;
}

function getToken(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromQuery = urlParams.get('token');
  
  if (tokenFromQuery) {
    localStorage.setItem('auth_token', tokenFromQuery);
    return tokenFromQuery;
  }
  
  return localStorage.getItem('auth_token');
}

export function useActiveSessionStream() {
  const [activeSession, setActiveSession] = useState<ActiveSessionStreamData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 segundo

  const connect = () => {
    const token = getToken();
    
    if (!token) {
      console.warn('Token não encontrado, não conectando ao SSE');
      return;
    }

    // Fechar conexão anterior se existir
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const url = `${API_BASE_URL}/sessions/active/stream?token=${encodeURIComponent(token)}`;
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE conectado');
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data: ActiveSessionStreamData = JSON.parse(event.data);
          setActiveSession(data);
        } catch (err) {
          console.error('Erro ao parsear dados SSE:', err);
        }
      };

      eventSource.onerror = (error) => {
        console.error('Erro no SSE:', error);
        setIsConnected(false);
        
        // Tentar reconectar com backoff exponencial
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts.current);
          reconnectAttempts.current++;
          
          console.log(`Tentando reconectar em ${delay}ms (tentativa ${reconnectAttempts.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.error('Máximo de tentativas de reconexão atingido');
        }
      };
    } catch (err) {
      console.error('Erro ao criar EventSource:', err);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, []);

  return {
    activeSession: activeSession?.active ? activeSession : null,
    elapsedSeconds: activeSession?.elapsedSeconds || 0,
    isConnected,
  };
}



