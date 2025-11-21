import express from 'express';
import { createSession, updateSessionMetrics, finalizeSession, getSessionDetails, logUsageEvent } from '../services/metrics.js';
import { checkTokenLimit, checkSessionLimit } from '../services/limits.js';
import { getUserSessions } from '../services/sessions.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Criar sessão
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { session_id, model = 'gpt-4o-mini-realtime-preview' } = req.body;
    const userId = req.userId;

    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    // Verificar limites antes de criar sessão
    const sessionLimitCheck = await checkSessionLimit(userId);
    if (!sessionLimitCheck.allowed) {
      return res.status(403).json({
        error: 'Session limit exceeded',
        details: sessionLimitCheck,
      });
    }

    // Criar sessão
    const session = await createSession(userId, session_id, model);

    res.status(201).json(session);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Session already exists' });
    }
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Atualizar métricas da sessão
router.post('/:sessionId/metrics', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { input_tokens, output_tokens } = req.body;

    const inputTokens = parseInt(input_tokens || 0);
    const outputTokens = parseInt(output_tokens || 0);

    if (inputTokens < 0 || outputTokens < 0) {
      return res.status(400).json({ error: 'Tokens must be non-negative' });
    }

    // Verificar limite de tokens antes de atualizar
    const tokenLimitCheck = await checkTokenLimit(req.userId, inputTokens + outputTokens);
    if (!tokenLimitCheck.allowed) {
      return res.status(403).json({
        error: 'Token limit exceeded',
        details: tokenLimitCheck,
      });
    }

    await updateSessionMetrics(sessionId, inputTokens, outputTokens);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating session metrics:', error);
    res.status(500).json({ error: error.message || 'Failed to update metrics' });
  }
});

// Finalizar sessão
router.post('/:sessionId/finalize', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await finalizeSession(sessionId);

    res.json(session);
  } catch (error) {
    console.error('Error finalizing session:', error);
    res.status(500).json({ error: error.message || 'Failed to finalize session' });
  }
});

// Obter detalhes da sessão
router.get('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await getSessionDetails(sessionId, req.userId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// Listar sessões do usuário
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Verificar se o usuário está consultando suas próprias sessões ou é admin
    if (userId !== req.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const sessions = await getUserSessions(userId, parseInt(limit), parseInt(offset));

    res.json(sessions);
  } catch (error) {
    console.error('Error getting user sessions:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Registrar evento de uso
router.post('/:sessionId/events', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { event_type, input_tokens, output_tokens, event_data } = req.body;

    if (!event_type) {
      return res.status(400).json({ error: 'event_type is required' });
    }

    await logUsageEvent(
      sessionId,
      req.userId,
      event_type,
      parseInt(input_tokens || 0),
      parseInt(output_tokens || 0),
      event_data
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error logging event:', error);
    res.status(500).json({ error: error.message || 'Failed to log event' });
  }
});

export default router;

