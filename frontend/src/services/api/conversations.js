import { request } from '../http.js';

/**
 * API de Conversas - Histórico de mensagens
 */
export const conversationsAPI = {
  /**
   * Salvar uma mensagem da conversa
   * @param {string} sessionId - ID da sessão
   * @param {Object} messageData - Dados da mensagem
   */
  async saveMessage(sessionId, messageData) {
    try {
      const response = await request(`/conversations/${sessionId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          role: messageData.role, // 'user' ou 'assistant'
          content: messageData.content,
          messageType: messageData.messageType || 'text',
          eventType: messageData.eventType || null,
          eventData: messageData.eventData || null,
          additionalAttributes: messageData.additionalAttributes || {},
        }),
      });
      return response;
    } catch (error) {
      console.error('[conversationsAPI] Error saving message:', error);
      throw error;
    }
  },

  /**
   * Obter histórico de mensagens de uma sessão
   * @param {string} sessionId - ID da sessão
   * @param {Object} options - Opções de paginação
   */
  async getHistory(sessionId, options = {}) {
    try {
      const { limit = 1000, offset = 0 } = options;
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      }).toString();
      
      const response = await request(`/conversations/${sessionId}/messages${queryParams ? `?${queryParams}` : ''}`);
      return response;
    } catch (error) {
      console.error('[conversationsAPI] Error getting conversation history:', error);
      throw error;
    }
  },

  /**
   * Obter estatísticas de uma conversa
   * @param {string} sessionId - ID da sessão
   */
  async getStats(sessionId) {
    try {
      const response = await request(`/conversations/${sessionId}/stats`);
      return response;
    } catch (error) {
      console.error('[conversationsAPI] Error getting conversation stats:', error);
      throw error;
    }
  },
};

