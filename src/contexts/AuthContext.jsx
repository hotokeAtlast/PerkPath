import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const ADMIN_PIN = '012026';

export function AuthProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(() => {
    return sessionStorage.getItem('perkpath_admin') === 'true';
  });

  const login = useCallback((pin) => {
    if (pin === ADMIN_PIN) {
      setIsAdmin(true);
      sessionStorage.setItem('perkpath_admin', 'true');
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setIsAdmin(false);
    sessionStorage.removeItem('perkpath_admin');
  }, []);

  const autoLogin = useCallback(() => {
    setIsAdmin(true);
    sessionStorage.setItem('perkpath_admin', 'true');
  }, []);

  return (
    <AuthContext.Provider value={{ isAdmin, login, logout, autoLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
