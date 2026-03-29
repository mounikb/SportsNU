import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

const DEV_TOKEN = 'dev-token';
const DEV_USER = { id: 'dev-user-id', email: 'dev@scorecard.local', displayName: 'Dev User' };

export function useAuth(): { isAuthenticated: boolean; loading: boolean } {
  const { isAuthenticated, login } = useAuthStore();

  useEffect(() => {
    const isDev = import.meta.env.VITE_DEV_AUTH === 'true';

    if (isDev && !isAuthenticated) {
      api.post('/auth/verify', {}).then(() => {
        login(DEV_USER, DEV_TOKEN);
      }).catch(console.error);
      return;
    }

    if (!isDev) {
      import('firebase/auth').then(({ getAuth, onAuthStateChanged }) => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            const token = await firebaseUser.getIdToken();
            const { data } = await api.post('/auth/verify', { token });
            login(
              { id: data.user.id, email: data.user.email, displayName: data.user.displayName },
              token
            );
          }
        });
        return unsubscribe;
      });
    }
  }, [isAuthenticated, login]);

  return { isAuthenticated, loading: false };
}
