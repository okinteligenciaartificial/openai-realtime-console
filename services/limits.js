import { query } from './database.js';

/**
 * Verifica se o usuário pode usar tokens adicionais
 */
export async function checkTokenLimit(userId, additionalTokens) {
  try {
    // Obter assinatura ativa do usuário
    const subscriptionResult = await query(
      `SELECT up.monthly_token_limit 
       FROM user_subscriptions us
       JOIN user_plans up ON us.plan_id = up.id
       WHERE us.user_id = $1 AND us.is_active = true
       ORDER BY us.start_date DESC
       LIMIT 1`,
      [userId]
    );

    if (subscriptionResult.rows.length === 0) {
      // Sem assinatura ativa, negar acesso
      return { allowed: false, reason: 'No active subscription' };
    }

    const plan = subscriptionResult.rows[0];
    
    // Se não há limite (NULL), permitir
    if (plan.monthly_token_limit === null) {
      return { allowed: true };
    }

    // Obter uso atual do mês
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const usageResult = await query(
      'SELECT tokens_used FROM usage_limits_tracking WHERE user_id = $1 AND year_month = $2',
      [userId, currentMonth]
    );

    const currentUsage = usageResult.rows.length > 0 
      ? usageResult.rows[0].tokens_used 
      : 0;

    const newTotal = currentUsage + additionalTokens;

    if (newTotal > plan.monthly_token_limit) {
      return {
        allowed: false,
        reason: 'Token limit exceeded',
        current: currentUsage,
        limit: plan.monthly_token_limit,
        requested: additionalTokens,
      };
    }

    return { allowed: true, current: currentUsage, limit: plan.monthly_token_limit };
  } catch (error) {
    console.error('Error checking token limit:', error);
    return { allowed: false, reason: 'Error checking limits' };
  }
}

/**
 * Verifica se o usuário pode criar uma nova sessão
 */
export async function checkSessionLimit(userId) {
  try {
    // Obter assinatura ativa do usuário
    const subscriptionResult = await query(
      `SELECT up.monthly_session_limit 
       FROM user_subscriptions us
       JOIN user_plans up ON us.plan_id = up.id
       WHERE us.user_id = $1 AND us.is_active = true
       ORDER BY us.start_date DESC
       LIMIT 1`,
      [userId]
    );

    if (subscriptionResult.rows.length === 0) {
      return { allowed: false, reason: 'No active subscription' };
    }

    const plan = subscriptionResult.rows[0];
    
    // Se não há limite (NULL), permitir
    if (plan.monthly_session_limit === null) {
      return { allowed: true };
    }

    // Obter número de sessões do mês
    const currentMonth = new Date().toISOString().slice(0, 7);
    const usageResult = await query(
      'SELECT sessions_count FROM usage_limits_tracking WHERE user_id = $1 AND year_month = $2',
      [userId, currentMonth]
    );

    const currentSessions = usageResult.rows.length > 0 
      ? usageResult.rows[0].sessions_count 
      : 0;

    if (currentSessions >= plan.monthly_session_limit) {
      return {
        allowed: false,
        reason: 'Session limit exceeded',
        current: currentSessions,
        limit: plan.monthly_session_limit,
      };
    }

    return { allowed: true, current: currentSessions, limit: plan.monthly_session_limit };
  } catch (error) {
    console.error('Error checking session limit:', error);
    return { allowed: false, reason: 'Error checking limits' };
  }
}

/**
 * Atualiza o rastreamento de uso mensal
 */
export async function updateUsageTracking(userId, tokens, sessionCount = 0) {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    await query(
      `INSERT INTO usage_limits_tracking (user_id, year_month, tokens_used, sessions_count)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, year_month) 
       DO UPDATE SET 
         tokens_used = usage_limits_tracking.tokens_used + $3,
         sessions_count = usage_limits_tracking.sessions_count + $4,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, currentMonth, tokens, sessionCount]
    );
  } catch (error) {
    console.error('Error updating usage tracking:', error);
    throw error;
  }
}

/**
 * Obtém uso atual do mês
 */
export async function getCurrentMonthUsage(userId) {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const result = await query(
      'SELECT * FROM usage_limits_tracking WHERE user_id = $1 AND year_month = $2',
      [userId, currentMonth]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    return {
      user_id: userId,
      year_month: currentMonth,
      tokens_used: 0,
      sessions_count: 0,
    };
  } catch (error) {
    console.error('Error getting current month usage:', error);
    throw error;
  }
}

