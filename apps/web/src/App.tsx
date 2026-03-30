import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { TeamPicker } from './pages/TeamPicker';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { useAuthStore } from './store/authStore';
import { useTeamStore } from './store/teamStore';
import { useAuth } from './hooks/useAuth';

function ProtectedRoute({ children }: { children: JSX.Element }): JSX.Element {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

function DashboardRoute(): JSX.Element {
  const followedTeams = useTeamStore((s) => s.followedTeams);
  if (followedTeams.length === 0) return <Navigate to="/pick-teams" replace />;
  return <Dashboard />;
}

export function App(): JSX.Element {
  useAuth();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/pick-teams"
          element={
            <ProtectedRoute>
              <TeamPicker />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardRoute />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
