import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as conversationsController from '../controllers/conversations.js';

const router = express.Router();

/**
 * POST /api/conversations/:sessionId/messages
 * Salvar uma mensagem da conversa
 */
router.post('/:sessionId/messages', authenticateToken, conversationsController.saveMessageController);

/**
 * GET /api/conversations/:sessionId/messages
 * Obter histórico de mensagens de uma sessão
 */
router.get('/:sessionId/messages', authenticateToken, conversationsController.getConversationHistoryController);

/**
 * GET /api/conversations/:sessionId/stats
 * Obter estatísticas de uma conversa
 */
router.get('/:sessionId/stats', authenticateToken, conversationsController.getConversationStatsController);

export default router;

