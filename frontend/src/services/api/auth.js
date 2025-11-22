/**
 * Serviços de autenticação
 */
import request from '../http.js';

export const authAPI = {
  /**
   * Login do usuário
   */
  async login(email, password) {
    const response = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return response;
  },

  /**
   * Registro de novo usuário
   */
  async register(email, name, password, role = 'student') {
    const response = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, name, password, role }),
    });
    return response;
  },

  /**
   * Obter informações do usuário autenticado
   */
  async me() {
    const response = await request('/auth/me');
    return response;
  },

  /**
   * Atualizar senha
   */
  async updatePassword(currentPassword, newPassword) {
    const response = await request('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return response;
  },
};
