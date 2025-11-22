import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Inicializar autenticação ao carregar
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Verificar se o token é válido
        const userData = await authAPI.me();
        setUser(userData);
      }
    } catch (err) {
      // Token inválido ou expirado
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await authAPI.login(email, password);
      localStorage.setItem('token', response.token);
      setUser(response.user);
      return response;
    } catch (err) {
      setError(err.message || 'Erro ao fazer login');
      throw err;
    }
  };

  const register = async (email, name, password, role = 'student') => {
    try {
      setError(null);
      const response = await authAPI.register(email, name, password, role);
      // Após registro, fazer login automaticamente
      if (response.user) {
        const loginResponse = await authAPI.login(email, password);
        localStorage.setItem('token', loginResponse.token);
        setUser(loginResponse.user);
        return loginResponse;
      }
      return response;
    } catch (err) {
      setError(err.message || 'Erro ao registrar');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setError(null);
  };

  const updatePassword = async (currentPassword, newPassword) => {
    try {
      setError(null);
      await authAPI.updatePassword(currentPassword, newPassword);
    } catch (err) {
      setError(err.message || 'Erro ao atualizar senha');
      throw err;
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updatePassword,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isTeacher: user?.role === 'teacher',
    isStudent: user?.role === 'student',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
