import { createSession, updateSessionMetrics, finalizeSession, getSessionDetails, logUsageEvent } from '../services/metrics.js';
import { checkTokenLimit, checkSessionLimit } from '../services/limits.js';
import { getUserSessions } from '../services/sessions.js';
import { query } from '../services/database.js';

/**
 * Criar sessão
 */
export async function createSessionController(req, res) {
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
}

/**
 * Atualizar métricas da sessão
 */
export async function updateSessionMetricsController(req, res) {
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
}

/**
 * Finalizar sessão
 */
export async function finalizeSessionController(req, res) {
  try {
    const { sessionId } = req.params;
    const session = await finalizeSession(sessionId);

    res.json(session);
  } catch (error) {
    console.error('Error finalizing session:', error);
    res.status(500).json({ error: error.message || 'Failed to finalize session' });
  }
}

/**
 * Obter sessões do usuário
 */
export async function getUserSessionsController(req, res) {
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
}

/**
 * Obter detalhes da sessão
 */
export async function getSessionController(req, res) {
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
}

// ============================================
// ADMIN CONTROLLERS
// ============================================

/**
 * Listar todas as sessões (admin only)
 */
export async function listSessions(req, res) {
  try {
    const { page = 1, limit = 50, user_id, status, start_date, end_date, model } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let queryText = `
      SELECT s.*, u.email, u.name as user_name, sm.input_tokens, sm.output_tokens, sm.total_tokens, sm.cost_total
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN session_metrics sm ON s.id = sm.session_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (user_id) {
      queryText += ` AND s.user_id = $${paramCount++}`;
      params.push(user_id);
    }

    if (status) {
      queryText += ` AND s.status = $${paramCount++}`;
      params.push(status);
    }

    if (model) {
      queryText += ` AND s.model = $${paramCount++}`;
      params.push(model);
    }

    if (start_date) {
      queryText += ` AND s.start_time >= $${paramCount++}`;
      params.push(start_date);
    }

    if (end_date) {
      queryText += ` AND s.start_time <= $${paramCount++}`;
      params.push(end_date);
    }

    queryText += ` ORDER BY s.start_time DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(parseInt(limit), offset);

    const result = await query(queryText, params);

    // Contar total
    let countQuery = 'SELECT COUNT(*) FROM sessions s WHERE 1=1';
    const countParams = [];
    paramCount = 1;

    if (user_id) {
      countQuery += ` AND s.user_id = $${paramCount++}`;
      countParams.push(user_id);
    }

    if (status) {
      countQuery += ` AND s.status = $${paramCount++}`;
      countParams.push(status);
    }

    if (model) {
      countQuery += ` AND s.model = $${paramCount++}`;
      countParams.push(model);
    }

    if (start_date) {
      countQuery += ` AND s.start_time >= $${paramCount++}`;
      countParams.push(start_date);
    }

    if (end_date) {
      countQuery += ` AND s.start_time <= $${paramCount++}`;
      countParams.push(end_date);
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      sessions: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error listing sessions:', error);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
}

/**
 * Obter estatísticas de sessões (admin only)
 */
export async function getSessionStats(req, res) {
  try {
    const { start_date, end_date } = req.query;

    let queryText = `
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
        COALESCE(SUM(sm.total_tokens), 0) as total_tokens,
        COALESCE(SUM(sm.cost_total), 0) as total_cost,
        COALESCE(SUM(s.duration_seconds), 0) as total_duration
      FROM sessions s
      LEFT JOIN session_metrics sm ON s.id = sm.session_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (start_date) {
      queryText += ` AND s.start_time >= $${paramCount++}`;
      params.push(start_date);
    }

    if (end_date) {
      queryText += ` AND s.start_time <= $${paramCount++}`;
      params.push(end_date);
    }

    const result = await query(queryText, params);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting session stats:', error);
    res.status(500).json({ error: 'Failed to get session stats' });
  }
}

/**
 * Registrar evento de uso
 */
export async function logEvent(req, res) {
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
}

