import { query } from './database.js';

/**
 * Valida se o usuário tem acesso à sessão
 */
export async function validateSessionAccess(sessionId, userId) {
  try {
    const result = await query(
      'SELECT id FROM sessions WHERE session_id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    return result.rows.length > 0;
  } catch (error) {
    console.error('Error validating session access:', error);
    return false;
  }
}

/**
 * Obtém sessões ativas de um usuário
 */
export async function getActiveSessions(userId) {
  try {
    const result = await query(
      `SELECT s.*, sm.input_tokens, sm.output_tokens, sm.total_tokens, sm.cost_total
       FROM sessions s
       LEFT JOIN session_metrics sm ON s.id = sm.session_id
       WHERE s.user_id = $1 AND s.status = 'active'
       ORDER BY s.start_time DESC`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting active sessions:', error);
    throw error;
  }
}

/**
 * Lista todas as sessões de um usuário
 */
export async function getUserSessions(userId, limit = 50, offset = 0) {
  try {
    const result = await query(
      `SELECT * FROM session_details 
       WHERE user_id = $1 
       ORDER BY start_time DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting user sessions:', error);
    throw error;
  }
}

