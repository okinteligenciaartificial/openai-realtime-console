import express from 'express';
import { getUserMetrics } from '../services/metrics.js';
import { getUserSessions } from '../services/sessions.js';
import { query } from '../services/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Resumo de métricas do usuário
router.get('/summary/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { start_date, end_date } = req.query;

    // Verificar se o usuário está consultando suas próprias métricas ou é admin
    if (userId !== req.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const metrics = await getUserMetrics(userId, start_date, end_date);

    res.json(metrics || {
      user_id: userId,
      total_sessions: 0,
      total_duration_seconds: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_tokens: 0,
      total_cost: 0,
    });
  } catch (error) {
    console.error('Error getting metrics summary:', error);
    res.status(500).json({ error: 'Failed to get metrics summary' });
  }
});

// Histórico de sessões do usuário
router.get('/sessions/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0, start_date, end_date } = req.query;

    // Verificar se o usuário está consultando suas próprias sessões ou é admin
    if (userId !== req.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    let sessions = await getUserSessions(userId, parseInt(limit), parseInt(offset));

    // Filtrar por data se fornecido
    if (start_date || end_date) {
      sessions = sessions.filter(session => {
        const sessionDate = new Date(session.start_time);
        if (start_date && sessionDate < new Date(start_date)) return false;
        if (end_date && sessionDate > new Date(end_date)) return false;
        return true;
      });
    }

    res.json(sessions);
  } catch (error) {
    console.error('Error getting sessions:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Exportar dados (JSON)
router.get('/export/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { format = 'json', start_date, end_date } = req.query;

    // Verificar se o usuário está exportando seus próprios dados ou é admin
    if (userId !== req.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const metrics = await getUserMetrics(userId, start_date, end_date);
    const sessions = await getUserSessions(userId, 10000, 0); // Limite alto para exportação

    const exportData = {
      user_id: userId,
      export_date: new Date().toISOString(),
      metrics,
      sessions: sessions.filter(session => {
        if (!start_date && !end_date) return true;
        const sessionDate = new Date(session.start_time);
        if (start_date && sessionDate < new Date(start_date)) return false;
        if (end_date && sessionDate > new Date(end_date)) return false;
        return true;
      }),
    };

    if (format === 'csv') {
      // Implementar CSV se necessário
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=metrics_${userId}_${Date.now()}.csv`);
      // Por enquanto retornar JSON
      res.json(exportData);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=metrics_${userId}_${Date.now()}.json`);
      res.json(exportData);
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

export default router;

