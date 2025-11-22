import { getUserMetrics } from '../services/metrics.js';
import { getUserSessions } from '../services/sessions.js';
import { query } from '../services/database.js';

/**
 * Resumo de métricas do usuário
 */
export async function getMetricsSummary(req, res) {
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
}

/**
 * Histórico de sessões do usuário
 */
export async function getUserSessionsMetrics(req, res) {
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
 * Exportar dados (JSON)
 */
export async function exportData(req, res) {
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
}

// ============================================
// ADMIN CONTROLLERS
// ============================================

/**
 * Estatísticas gerais do sistema (admin only)
 */
export async function getOverviewStats(req, res) {
  try {
    const { start_date, end_date } = req.query;

    let dateFilter = '';
    const params = [];
    let paramCount = 1;

    if (start_date || end_date) {
      dateFilter = 'WHERE 1=1';
      if (start_date) {
        dateFilter += ` AND s.start_time >= $${paramCount++}`;
        params.push(start_date);
      }
      if (end_date) {
        dateFilter += ` AND s.start_time <= $${paramCount++}`;
        params.push(end_date);
      }
    }

    // Total de usuários
    const usersResult = await query('SELECT COUNT(*) as total FROM users WHERE is_active = true');
    const totalUsers = parseInt(usersResult.rows[0].total);

    // Total de sessões
    const sessionsQuery = `SELECT COUNT(*) as total FROM sessions s ${dateFilter}`;
    const sessionsResult = await query(sessionsQuery, params);
    const totalSessions = parseInt(sessionsResult.rows[0].total);

    // Total de tokens e custo
    const tokensQuery = `
      SELECT 
        COALESCE(SUM(sm.total_tokens), 0) as total_tokens,
        COALESCE(SUM(sm.cost_total), 0) as total_cost
      FROM sessions s
      LEFT JOIN session_metrics sm ON s.id = sm.session_id
      ${dateFilter}
    `;
    const tokensResult = await query(tokensQuery, params);
    const totalTokens = parseInt(tokensResult.rows[0].total_tokens);
    const totalCost = parseFloat(tokensResult.rows[0].total_cost);

    // Usuários ativos (com sessões no período)
    const activeUsersQuery = `
      SELECT COUNT(DISTINCT user_id) as total
      FROM sessions s
      ${dateFilter}
    `;
    const activeUsersResult = await query(activeUsersQuery, params);
    const activeUsers = parseInt(activeUsersResult.rows[0].total);

    res.json({
      totalUsers,
      activeUsers,
      totalSessions,
      totalTokens,
      totalCost,
    });
  } catch (error) {
    console.error('Error getting overview stats:', error);
    res.status(500).json({ error: 'Failed to get overview stats' });
  }
}

/**
 * Estatísticas por usuário (admin only)
 */
export async function getUserStats(req, res) {
  try {
    const { limit = 10, start_date, end_date } = req.query;

    // Construir filtro de data para o JOIN
    let sessionDateFilter = '';
    const params = [];
    let paramCount = 1;

    if (start_date || end_date) {
      const conditions = [];
      if (start_date) {
        conditions.push(`s.start_time >= $${paramCount++}`);
        params.push(start_date);
      }
      if (end_date) {
        conditions.push(`s.start_time <= $${paramCount++}`);
        params.push(end_date);
      }
      if (conditions.length > 0) {
        sessionDateFilter = 'AND ' + conditions.join(' AND ');
      }
    }

    const queryText = `
      SELECT 
        u.id,
        u.email,
        u.name,
        COUNT(DISTINCT s.id) as session_count,
        COALESCE(SUM(sm.total_tokens), 0) as total_tokens,
        COALESCE(SUM(sm.cost_total), 0) as total_cost
      FROM users u
      LEFT JOIN sessions s ON u.id = s.user_id ${sessionDateFilter}
      LEFT JOIN session_metrics sm ON s.id = sm.session_id
      WHERE u.is_active = true
      GROUP BY u.id, u.email, u.name
      ORDER BY total_tokens DESC
      LIMIT $${paramCount}
    `;
    params.push(parseInt(limit));

    const result = await query(queryText, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ error: 'Failed to get user stats' });
  }
}

/**
 * Análise de custos (admin only)
 */
export async function getCostStats(req, res) {
  try {
    const { start_date, end_date, group_by = 'day' } = req.query;

    let dateFilter = '';
    const params = [];
    let paramCount = 1;

    if (start_date || end_date) {
      dateFilter = 'WHERE 1=1';
      if (start_date) {
        dateFilter += ` AND s.start_time >= $${paramCount++}`;
        params.push(start_date);
      }
      if (end_date) {
        dateFilter += ` AND s.start_time <= $${paramCount++}`;
        params.push(end_date);
      }
    }

    let groupByClause = '';
    if (group_by === 'day') {
      groupByClause = "DATE_TRUNC('day', s.start_time)";
    } else if (group_by === 'week') {
      groupByClause = "DATE_TRUNC('week', s.start_time)";
    } else if (group_by === 'month') {
      groupByClause = "DATE_TRUNC('month', s.start_time)";
    } else {
      groupByClause = "DATE_TRUNC('day', s.start_time)";
    }

    const queryText = `
      SELECT 
        ${groupByClause} as period,
        COUNT(*) as session_count,
        COALESCE(SUM(sm.total_tokens), 0) as total_tokens,
        COALESCE(SUM(sm.cost_total), 0) as total_cost
      FROM sessions s
      LEFT JOIN session_metrics sm ON s.id = sm.session_id
      ${dateFilter}
      GROUP BY ${groupByClause}
      ORDER BY period DESC
    `;

    const result = await query(queryText, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Error getting cost stats:', error);
    res.status(500).json({ error: 'Failed to get cost stats' });
  }
}

/**
 * Análise de uso (admin only)
 */
export async function getUsageStats(req, res) {
  try {
    const { start_date, end_date } = req.query;

    let dateFilter = '';
    const params = [];
    let paramCount = 1;

    if (start_date || end_date) {
      dateFilter = 'WHERE 1=1';
      if (start_date) {
        dateFilter += ` AND s.start_time >= $${paramCount++}`;
        params.push(start_date);
      }
      if (end_date) {
        dateFilter += ` AND s.start_time <= $${paramCount++}`;
        params.push(end_date);
      }
    }

    const queryText = `
      SELECT 
        DATE_TRUNC('day', s.start_time) as date,
        COUNT(*) as sessions,
        COALESCE(SUM(sm.input_tokens), 0) as input_tokens,
        COALESCE(SUM(sm.output_tokens), 0) as output_tokens,
        COALESCE(SUM(sm.total_tokens), 0) as total_tokens,
        COALESCE(SUM(s.duration_seconds), 0) as total_duration
      FROM sessions s
      LEFT JOIN session_metrics sm ON s.id = sm.session_id
      ${dateFilter}
      GROUP BY DATE_TRUNC('day', s.start_time)
      ORDER BY date DESC
      LIMIT 30
    `;

    const result = await query(queryText, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Error getting usage stats:', error);
    res.status(500).json({ error: 'Failed to get usage stats' });
  }
}

