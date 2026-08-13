import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { getMe, login as apiLogin, logout as apiLogout } from './api';
import { isLoginPath } from './public-path';

interface AuthContextValue {
  username: string | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getMe()
      .then((me) => setUsername(me.username))
      .catch(() => setUsername(null))
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (user: string, password: string) => {
    const me = await apiLogin(user, password);
    setUsername(me.username);
    if (isLoginPath()) window.history.replaceState(null, '', '/');
  }, []);

  const logout = useCallback(async () => {
    await apiLogout().catch(() => {});
    setUsername(null);
    window.history.replaceState(null, '', '/consulta');
    window.location.assign('/consulta');
  }, []);

  return (
    <AuthContext.Provider value={{ username, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
