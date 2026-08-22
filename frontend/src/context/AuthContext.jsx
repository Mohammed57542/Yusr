import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('yusr_token'));
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api.get('/subscription/me')
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('yusr_token');
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = (newToken, newUser) => {
    localStorage.setItem('yusr_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('yusr_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
