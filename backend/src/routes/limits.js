import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { checkTokenLimit, checkSessionLimit, getCurrentMonthUsage } from '../services/limits.js';

const router = express.Router();

/**
 * GET /api/limits/tokens
 * Verificar limite de tokens do usuário autenticado
 * Query params: additionalTokens (opcional) - tokens adicionais a verificar
 */
router.get('/tokens', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const additionalTokens = parseInt(req.query.additionalTokens || 0);

    const result = await checkTokenLimit(userId, additionalTokens);
    res.json(result);
  } catch (error) {
    console.error('Error checking token limit:', error);
    res.status(500).json({ error: 'Failed to check token limit', message: error.message });
  }
});

/**
 * GET /api/limits/sessions
 * Verificar limite de sessões do usuário autenticado
 */
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const result = await checkSessionLimit(userId);
    res.json(result);
  } catch (error) {
    console.error('Error checking session limit:', error);
    res.status(500).json({ error: 'Failed to check session limit', message: error.message });
  }
});

/**
 * GET /api/limits/usage
 * Obter uso atual do mês do usuário autenticado
 */
router.get('/usage', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const usage = await getCurrentMonthUsage(userId);
    res.json(usage);
  } catch (error) {
    console.error('Error getting current month usage:', error);
    res.status(500).json({ error: 'Failed to get usage', message: error.message });
  }
});

export default router;

