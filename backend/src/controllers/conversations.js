import { saveMessage, getConversationHistory, getConversationStats } from '../services/conversations.js';

/**
 * Salvar uma mensagem da conversa
 * POST /api/conversations/:sessionId/messages
 */
export async function saveMessageController(req, res) {
  try {
    const { sessionId } = req.params;
    const { role, content, messageType, eventType, eventData, additionalAttributes } = req.body;
    const userId = req.userId;

    console.log('[saveMessageController] Received request:', {
      sessionId,
      userId,
      role,
      contentLength: content?.length,
      contentPreview: content?.substring(0, 100),
      messageType,
      eventType,
      hasEventData: !!eventData,
    });

    // Validações
    if (!role || !['user', 'assistant', 'system'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be user, assistant, or system' });
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      console.warn('[saveMessageController] ⚠️ Invalid content:', {
        hasContent: !!content,
        contentType: typeof content,
        contentLength: content?.length,
        contentPreview: content?.substring(0, 100),
      });
      return res.status(400).json({ error: 'Content is required and must be a non-empty string' });
    }

    // Salvar mensagem
    const message = await saveMessage(sessionId, userId, role, content.trim(), {
      messageType: messageType || 'text',
      eventType: eventType || null,
      eventData: eventData || null,
      additionalAttributes: additionalAttributes || {},
    });

    console.log('[saveMessageController] ✅ Message saved successfully:', {
      messageId: message.id,
      sequenceNumber: message.sequence_number,
      role,
      contentLength: content.trim().length,
    });

    res.status(201).json({
      success: true,
      message: {
        id: message.id,
        sequenceNumber: message.sequence_number,
        createdAt: message.created_at,
      },
    });
  } catch (error) {
    console.error('[saveMessageController] ❌ Error:', error);
    
    if (error.message.includes('Session not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to save message', message: error.message });
  }
}

/**
 * Obter histórico de mensagens de uma sessão
 * GET /api/conversations/:sessionId/messages
 */
export async function getConversationHistoryController(req, res) {
  try {
    const { sessionId } = req.params;
    const userId = req.userId;
    const { limit = 1000, offset = 0 } = req.query;

    const messages = await getConversationHistory(sessionId, userId, {
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    res.json({
      success: true,
      messages,
      count: messages.length,
    });
  } catch (error) {
    console.error('[getConversationHistoryController] Error:', error);
    
    if (error.message.includes('Session not found')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('Forbidden')) {
      return res.status(403).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to get conversation history', message: error.message });
  }
}

/**
 * Obter estatísticas de uma conversa
 * GET /api/conversations/:sessionId/stats
 */
export async function getConversationStatsController(req, res) {
  try {
    const { sessionId } = req.params;
    const userId = req.userId;

    const stats = await getConversationStats(sessionId, userId);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('[getConversationStatsController] Error:', error);
    
    if (error.message.includes('Session not found')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('Forbidden')) {
      return res.status(403).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to get conversation stats', message: error.message });
  }
}

