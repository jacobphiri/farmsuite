import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getBootstrap, login, switchFarm } from '../api/endpoints.js';
import { readCache, writeCache } from '../utils/cache.js';

const AuthContext = createContext(null);

function persistAuth(token, bootstrap) {
  if (token) localStorage.setItem('farmreact:token', token);
  if (bootstrap) writeCache('bootstrap', bootstrap);
}

function clearAuth() {
  localStorage.removeItem('farmreact:token');
  localStorage.removeItem('farmreact:cache:bootstrap');
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('farmreact:token'));
  const [bootstrap, setBootstrap] = useState(readCache('bootstrap', Number.POSITIVE_INFINITY));
  const [loading, setLoading] = useState(Boolean(token));

  async function refreshBootstrap() {
    if (!token) return;

    setLoading(true);
    try {
      const response = await getBootstrap();
      if (!response?.ok) {
        throw new Error(response?.message || 'Unable to load bootstrap context.');
      }
      setBootstrap(response);
      writeCache('bootstrap', response);
      return response;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    refreshBootstrap().catch(() => {
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loginUser(credentials) {
    setLoading(true);
    try {
      const response = await login(credentials);
      if (!response?.ok) {
        throw new Error(response?.message || 'Login failed.');
      }

      const nextToken = response.token;
      setToken(nextToken);
      localStorage.setItem('farmreact:token', nextToken);

      const bootstrapResponse = await getBootstrap();
      if (!bootstrapResponse?.ok) {
        throw new Error(bootstrapResponse?.message || 'Unable to load bootstrap context.');
      }
      setBootstrap(bootstrapResponse);
      persistAuth(nextToken, bootstrapResponse);

      return bootstrapResponse;
    } finally {
      setLoading(false);
    }
  }

  async function switchFarmContext(farmId) {
    setLoading(true);
    try {
      const response = await switchFarm(farmId);
      if (!response?.ok) {
        throw new Error(response?.message || 'Unable to switch farm.');
      }

      const nextToken = response.token;
      setToken(nextToken);
      localStorage.setItem('farmreact:token', nextToken);

      const bootstrapResponse = await getBootstrap();
      if (!bootstrapResponse?.ok) {
        throw new Error(bootstrapResponse?.message || 'Unable to load bootstrap context.');
      }
      setBootstrap(bootstrapResponse);
      persistAuth(nextToken, bootstrapResponse);

      return bootstrapResponse;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setToken(null);
    setBootstrap(null);
    setLoading(false);
    clearAuth();
  }

  const value = useMemo(() => ({
    token,
    bootstrap,
    loading,
    isAuthenticated: Boolean(token),
    loginUser,
    logout,
    refreshBootstrap,
    switchFarmContext
  }), [token, bootstrap, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
