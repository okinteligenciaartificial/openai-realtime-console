/**
 * Serviços de planos
 */
import request from '../http.js';

export const plansAPI = {
  /**
   * Listar planos ativos
   */
  async list() {
    const response = await request('/plans');
    return response;
  },

  /**
   * Listar todos os planos (Admin)
   */
  async listAll() {
    const response = await request('/plans/admin/plans');
    return response;
  },

  /**
   * Obter plano por ID (Admin)
   */
  async get(planId) {
    const response = await request(`/plans/admin/plans/${planId}`);
    return response;
  },

  /**
   * Criar plano (Admin)
   */
  async create(planData) {
    const response = await request('/plans/admin/plans', {
      method: 'POST',
      body: JSON.stringify(planData),
    });
    return response;
  },

  /**
   * Atualizar plano (Admin)
   */
  async update(planId, planData) {
    const response = await request(`/plans/admin/plans/${planId}`, {
      method: 'PUT',
      body: JSON.stringify(planData),
    });
    return response;
  },

  /**
   * Deletar plano (Admin)
   */
  async delete(planId) {
    const response = await request(`/plans/admin/plans/${planId}`, {
      method: 'DELETE',
    });
    return response;
  },
};
