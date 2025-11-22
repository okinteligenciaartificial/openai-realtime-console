/**
 * Serviços de usuários
 */
import request from '../http.js';

export const usersAPI = {
  /**
   * Obter usuário por ID
   */
  async getUser(userId) {
    const response = await request(`/users/${userId}`);
    return response;
  },

  /**
   * Listar todos os usuários (Admin)
   */
  async listUsers(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await request(`/users/admin/users${queryParams ? `?${queryParams}` : ''}`);
    return response;
  },

  /**
   * Criar usuário (Admin)
   */
  async createUser(userData) {
    const response = await request('/users/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return response;
  },

  /**
   * Atualizar usuário (Admin)
   */
  async updateUser(userId, userData) {
    const response = await request(`/users/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    return response;
  },

  /**
   * Deletar usuário (Admin)
   */
  async deleteUser(userId) {
    const response = await request(`/users/admin/users/${userId}`, {
      method: 'DELETE',
    });
    return response;
  },
};
