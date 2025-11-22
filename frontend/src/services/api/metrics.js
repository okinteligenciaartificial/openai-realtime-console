/**
 * Serviços de métricas
 */
import request from '../http.js';

export const metricsAPI = {
  /**
   * Obter resumo de métricas do usuário
   */
  async getSummary(userId, params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await request(`/metrics/summary/${userId}${queryParams ? `?${queryParams}` : ''}`);
    return response;
  },

  /**
   * Obter métricas de sessões do usuário
   */
  async getSessions(userId) {
    const response = await request(`/metrics/sessions/${userId}`);
    return response;
  },

  /**
   * Exportar dados do usuário
   */
  async export(userId, params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await request(`/metrics/export/${userId}${queryParams ? `?${queryParams}` : ''}`);
    return response;
  },

  /**
   * Obter estatísticas gerais (Admin)
   */
  async getOverview() {
    const response = await request('/metrics/admin/stats/overview');
    return response;
  },

  /**
   * Obter estatísticas de usuários (Admin)
   */
  async getUserStats() {
    const response = await request('/metrics/admin/stats/users');
    return response;
  },

  /**
   * Obter estatísticas de custos (Admin)
   */
  async getCostStats() {
    const response = await request('/metrics/admin/stats/costs');
    return response;
  },

  /**
   * Obter estatísticas de uso (Admin)
   */
  async getUsageStats(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await request(`/metrics/admin/stats/usage${queryParams ? `?${queryParams}` : ''}`);
    return response;
  },
};
