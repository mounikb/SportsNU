import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

function decodeJWT(
  token: string
): { sub: string; email: string; displayName?: string; exp: number } | null {
  try {
    return JSON.parse(atob(token.split('.')[1])) as {
      sub: string;
      email: string;
      displayName?: string;
      exp: number;
    };
  } catch {
    return null;
  }
}

export function useAuth(): { isAuthenticated: boolean } {
  const { isAuthenticated, login } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) return;

    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const payload = decodeJWT(token);
    if (!payload || payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('auth_token');
      return;
    }

    login(
      { id: payload.sub, email: payload.email, displayName: payload.displayName },
      token
    );
  }, [isAuthenticated, login]);

  return { isAuthenticated };
}
