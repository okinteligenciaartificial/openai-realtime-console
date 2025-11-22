import { request } from '../http.js';

/**
 * API de Realtime - Conversas em tempo real
 * TODA A LÓGICA ESTÁ NO BACKEND
 * O frontend apenas consome os endpoints do backend
 */
export const realtimeAPI = {
  /**
   * Obter token para sessão Realtime
   * Chama o endpoint do backend: GET /api/realtime/token
   * O userId é obtido do token JWT no backend
   */
  async getToken() {
    try {
      return await request('/realtime/token', {
        method: 'GET',
      });
    } catch (error) {
      console.error('Error getting realtime token:', error);
      throw error;
    }
  },

  /**
   * Criar sessão Realtime
   * Chama o endpoint do backend: POST /api/realtime/session
   * Body: SDP offer como string (text/plain)
   * O userId é obtido do token JWT no backend
   * 
   * @param {string} sdpOffer - O SDP offer do WebRTC
   * @param {string} clientSecret - Opcional: chave ephemeral (client_secret) para usar na autenticação
   */
  async createSession(sdpOffer, clientSecret = null) {
    try {
      console.log('[RealtimeAPI] Creating session with clientSecret:', {
        hasClientSecret: !!clientSecret,
        clientSecretPrefix: clientSecret ? clientSecret.substring(0, 10) + '...' : null,
      });
      
      // O endpoint espera text/plain, não JSON
      const headers = {
        'Content-Type': 'text/plain',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      };
      
      // Se client_secret for fornecido, passar como header E query param para garantir
      if (clientSecret) {
        headers['X-Client-Secret'] = clientSecret;
      }
      
      const url = `${import.meta.env.VITE_API_BASE || '/api'}/realtime/session${clientSecret ? `?client_secret=${encodeURIComponent(clientSecret)}` : ''}`;
      console.log('[RealtimeAPI] Request URL:', url.substring(0, 100) + '...');
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: sdpOffer,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      // A resposta é o SDP answer como texto
      // IMPORTANTE: O backend retorna o sessionId no header
      const sessionId = response.headers.get('X-Session-Id');
      const sdpAnswer = await response.text();
      
      // Retornar tanto o SDP quanto o sessionId
      return { sdp: sdpAnswer, sessionId };
    } catch (error) {
      console.error('Error creating realtime session:', error);
      throw error;
    }
  },

  /**
   * Enviar evento da sessão Realtime para o backend processar tokens
   * O backend faz 100% da lógica de contabilização
   * 
   * @param {string} sessionId - ID da sessão
   * @param {Object} event - Evento recebido da API Realtime
   */
  async sendEvent(sessionId, event) {
    try {
      console.log('[RealtimeAPI] Sending event to backend:', {
        sessionId,
        eventType: event.type,
        hasUsage: !!event.usage,
        url: `/realtime/events/${sessionId}`,
      });
      
      // Enviar evento para o backend processar
      // Não processar tokens no frontend - apenas enviar
      const response = await request(`/realtime/events/${sessionId}`, {
        method: 'POST',
        body: JSON.stringify(event),
      });
      
      console.log('[RealtimeAPI] ✅ Event sent successfully:', response);
      return response;
    } catch (error) {
      // Não bloquear o fluxo se houver erro no envio do evento
      // Apenas logar para debug
      console.error('[RealtimeAPI] ❌ Error sending event to backend:', {
        sessionId,
        eventType: event.type,
        error: error.message,
        errorDetails: error,
      });
      throw error;
    }
  },
};

