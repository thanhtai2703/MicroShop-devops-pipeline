import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { apiRequest, setAccessToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [busy, setBusy] = useState(false);

  const login = useCallback(async ({ email, password }) => {
    setBusy(true);
    try {
      const session = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      setAccessToken(session.token);

      try {
        const profile = await apiRequest('/auth/me');
        setToken(session.token);
        setUser(profile);
        return profile;
      } catch (error) {
        setAccessToken(null);
        throw error;
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const register = useCallback(
    async ({ name, email, password }) => {
      setBusy(true);
      try {
        await apiRequest('/auth/register', {
          method: 'POST',
          body: { name, email, password },
        });
      } finally {
        setBusy(false);
      }

      return login({ email, password });
    },
    [login],
  );

  const logout = useCallback(() => {
    setAccessToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      busy,
      isAuthenticated: Boolean(token),
      login,
      logout,
      register,
      token,
      user,
    }),
    [busy, login, logout, register, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}

