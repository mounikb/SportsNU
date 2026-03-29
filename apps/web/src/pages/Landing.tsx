import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

const DEV_USER = { id: 'dev-user-id', email: 'dev@scorecard.local', displayName: 'Dev User' };

export function Landing(): JSX.Element {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isDev = import.meta.env.VITE_DEV_AUTH === 'true';

  async function handleDevLogin(): Promise<void> {
    await api.post('/auth/verify', {});
    login(DEV_USER, 'dev-token');
    navigate('/pick-teams');
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-4xl font-bold text-text mb-2">
          Score<span className="text-accent">card</span>
        </h1>
        <p className="text-text-muted text-sm mb-10">
          Your teams. Live scores. Nothing else.
        </p>

        {isDev ? (
          <button
            onClick={() => void handleDevLogin()}
            className="w-full bg-accent text-bg font-semibold py-3 rounded-card hover:opacity-90 transition-opacity"
          >
            Continue as Dev User
          </button>
        ) : (
          <div className="space-y-3">
            <button className="w-full bg-accent text-bg font-semibold py-3 rounded-card hover:opacity-90 transition-opacity">
              Continue with Google
            </button>
            <button className="w-full bg-card border border-card-border text-text font-medium py-3 rounded-card hover:border-accent/50 transition-colors">
              Sign in with Email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
