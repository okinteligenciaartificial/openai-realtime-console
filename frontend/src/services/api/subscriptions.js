/**
 * Serviços de assinaturas
 */
import request from '../http.js';

export const subscriptionsAPI = {
  /**
   * Criar assinatura
   */
  async create(subscriptionData) {
    const response = await request('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(subscriptionData),
    });
    return response;
  },

  /**
   * Obter assinatura do usuário
   */
  async getUserSubscription(userId) {
    const response = await request(`/subscriptions/user/${userId}`);
    return response;
  },

  /**
   * Atualizar assinatura
   */
  async update(subscriptionId, subscriptionData) {
    const response = await request(`/subscriptions/${subscriptionId}`, {
      method: 'PUT',
      body: JSON.stringify(subscriptionData),
    });
    return response;
  },

  /**
   * Listar todas as assinaturas (Admin)
   */
  async listAll() {
    const response = await request('/subscriptions/admin/subscriptions');
    return response;
  },

  /**
   * Criar assinatura (Admin)
   */
  async createAdmin(subscriptionData) {
    const response = await request('/subscriptions/admin/subscriptions', {
      method: 'POST',
      body: JSON.stringify(subscriptionData),
    });
    return response;
  },

  /**
   * Atualizar assinatura (Admin)
   */
  async updateAdmin(subscriptionId, subscriptionData) {
    const response = await request(`/subscriptions/admin/subscriptions/${subscriptionId}`, {
      method: 'PUT',
      body: JSON.stringify(subscriptionData),
    });
    return response;
  },
};
