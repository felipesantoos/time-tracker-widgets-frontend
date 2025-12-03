import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useActiveSessionStream, type ActiveSessionStreamData } from '../hooks/useActiveSessionStream';

interface ActiveSessionContextType {
  activeSession: ActiveSessionStreamData | null;
  elapsedSeconds: number;
  isConnected: boolean;
}

const ActiveSessionContext = createContext<ActiveSessionContextType | undefined>(undefined);

export function ActiveSessionProvider({ children }: { children: ReactNode }) {
  const { activeSession, elapsedSeconds, isConnected } = useActiveSessionStream();

  return (
    <ActiveSessionContext.Provider value={{ activeSession, elapsedSeconds, isConnected }}>
      {children}
    </ActiveSessionContext.Provider>
  );
}

export function useActiveSession() {
  const context = useContext(ActiveSessionContext);
  if (context === undefined) {
    throw new Error('useActiveSession deve ser usado dentro de ActiveSessionProvider');
  }
  return context;
}

