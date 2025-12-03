import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import TimerWidget from './pages/TimerWidget';
import ProjectsWidget from './pages/ProjectsWidget';
import SessionsWidget from './pages/SessionsWidget';
import ReportsWidget from './pages/ReportsWidget';
import SettingsWidget from './pages/SettingsWidget';
import HomePage from './pages/HomePage';
import './App.css';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, error } = useAuth();

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Verificando autenticação...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Token inválido ou ausente</h2>
        <p>{error || 'Por favor, verifique o token na URL (?token=...)'}</p>
      </div>
    );
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/timer"
            element={
              <AuthGuard>
                <TimerWidget />
              </AuthGuard>
            }
          />
          <Route
            path="/projects"
            element={
              <AuthGuard>
                <ProjectsWidget />
              </AuthGuard>
            }
          />
          <Route
            path="/sessions"
            element={
              <AuthGuard>
                <SessionsWidget />
              </AuthGuard>
            }
          />
          <Route
            path="/reports"
            element={
              <AuthGuard>
                <ReportsWidget />
              </AuthGuard>
            }
          />
          <Route
            path="/settings"
            element={
              <AuthGuard>
                <SettingsWidget />
              </AuthGuard>
            }
          />
          <Route
            path="/"
            element={<HomePage />}
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
