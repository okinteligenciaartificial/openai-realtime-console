/**
 * Serviços de sessões
 */
import request from '../http.js';

export const sessionsAPI = {
  /**
   * Criar sessão
   */
  async create(sessionData) {
    const response = await request('/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
    return response;
  },

  /**
   * Obter sessão específica
   */
  async get(sessionId) {
    const response = await request(`/sessions/${sessionId}`);
    return response;
  },

  /**
   * Obter sessões do usuário
   */
  async getUserSessions(userId, limit = 50, offset = 0, params = {}) {
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      ...params,
    }).toString();
    const response = await request(`/sessions/user/${userId}${queryParams ? `?${queryParams}` : ''}`);
    return response;
  },

  /**
   * Adicionar métricas à sessão
   */
  async addMetrics(sessionId, metrics) {
    const response = await request(`/sessions/${sessionId}/metrics`, {
      method: 'POST',
      body: JSON.stringify({
        input_tokens: metrics.input_tokens || metrics.inputTokens || 0,
        output_tokens: metrics.output_tokens || metrics.outputTokens || 0,
      }),
    });
    return response;
  },

  /**
   * Finalizar sessão
   */
  async finalize(sessionId, durationSeconds) {
    const response = await request(`/sessions/${sessionId}/finalize`, {
      method: 'POST',
      body: JSON.stringify({ duration_seconds: durationSeconds }),
    });
    return response;
  },

  /**
   * Listar todas as sessões (Admin)
   */
  async listAll(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await request(`/sessions/admin/sessions${queryParams ? `?${queryParams}` : ''}`);
    return response;
  },

  /**
   * Obter estatísticas de sessões (Admin)
   */
  async getStats(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await request(`/sessions/admin/sessions/stats${queryParams ? `?${queryParams}` : ''}`);
    return response;
  },
};
