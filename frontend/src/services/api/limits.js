import { request } from '../http.js';

/**
 * API de limites - TODA A LÓGICA ESTÁ NO BACKEND
 * O frontend apenas consome os endpoints do backend
 */
export const limitsAPI = {
  /**
   * Verificar se o usuário pode usar tokens adicionais
   * Chama o endpoint do backend: GET /api/limits/tokens?additionalTokens=X
   * O userId é obtido do token JWT no backend
   */
  async checkTokenLimit(additionalTokens = 0) {
    try {
      const params = new URLSearchParams();
      if (additionalTokens > 0) {
        params.append('additionalTokens', additionalTokens.toString());
      }
      
      const queryString = params.toString();
      const endpoint = `/limits/tokens${queryString ? `?${queryString}` : ''}`;
      
      return await request(endpoint, {
        method: 'GET',
      });
    } catch (error) {
      console.error('Error checking token limit:', error);
      return { 
        allowed: false, 
        reason: error.message || 'Error checking token limit',
        error: error.response?.data || error.message,
      };
    }
  },

  /**
   * Verificar se o usuário pode criar uma nova sessão
   * Chama o endpoint do backend: GET /api/limits/sessions
   * O userId é obtido do token JWT no backend
   */
  async checkSessionLimit() {
    try {
      return await request('/limits/sessions', {
        method: 'GET',
      });
    } catch (error) {
      console.error('Error checking session limit:', error);
      return { 
        allowed: false, 
        reason: error.message || 'Error checking session limit',
        error: error.response?.data || error.message,
      };
    }
  },

  /**
   * Obter uso atual do mês
   * Chama o endpoint do backend: GET /api/limits/usage
   * O userId é obtido do token JWT no backend
   */
  async getCurrentUsage() {
    try {
      return await request('/limits/usage', {
        method: 'GET',
      });
    } catch (error) {
      console.error('Error getting current usage:', error);
      throw error;
    }
  },
};

