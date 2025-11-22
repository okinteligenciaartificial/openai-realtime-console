import { query } from './database.js';
import { getPricingForModel, calculateCost } from './pricing.js';
import { updateUsageTracking } from './limits.js';

/**
 * Cria uma nova sessão
 */
export async function createSession(userId, sessionId, model = 'gpt-4o-mini-realtime-preview') {
  try {
    const result = await query(
      `INSERT INTO sessions (user_id, session_id, model, start_time, status)
       VALUES ($1, $2, $3, NOW(), 'active')
       RETURNING id, session_id, start_time`,
      [userId, sessionId, model]
    );

    // Inicializar métricas da sessão
    await query(
      `INSERT INTO session_metrics (session_id, input_tokens, output_tokens, total_tokens)
       VALUES ($1, 0, 0, 0)`,
      [result.rows[0].id]
    );

    // IMPORTANTE: Debitar a sessão imediatamente ao criar (não só ao finalizar)
    // Isso garante que o limite seja respeitado desde o início
    await updateUsageTracking(userId, 0, 1);

    return result.rows[0];
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
}

/**
 * Atualiza métricas de uma sessão
 */
export async function updateSessionMetrics(sessionId, inputTokens, outputTokens) {
  try {
    // Garantir que tokens sejam números válidos
    inputTokens = parseInt(inputTokens || 0, 10);
    outputTokens = parseInt(outputTokens || 0, 10);
    
    console.log('[updateSessionMetrics] Called with:', {
      sessionId,
      inputTokens,
      outputTokens,
      total: inputTokens + outputTokens,
    });
    
    // Buscar sessão pelo session_id (string)
    const sessionResult = await query(
      'SELECT id, user_id, model FROM sessions WHERE session_id = $1',
      [sessionId]
    );

    console.log('[updateSessionMetrics] Session lookup result:', {
      sessionId,
      found: sessionResult.rows.length > 0,
      dbId: sessionResult.rows[0]?.id,
      userId: sessionResult.rows[0]?.user_id,
      model: sessionResult.rows[0]?.model,
    });

    if (sessionResult.rows.length === 0) {
      console.error('[updateSessionMetrics] ❌ Session not found:', sessionId);
      throw new Error(`Session not found: ${sessionId}`);
    }

    const dbSessionId = sessionResult.rows[0].id;
    const userId = sessionResult.rows[0].user_id;
    const model = sessionResult.rows[0].model;
    const totalTokens = inputTokens + outputTokens;

    // Obter preços
    const pricing = await getPricingForModel(model);
    const cost = calculateCost(inputTokens, outputTokens, pricing);
    
    console.log('[updateSessionMetrics] Pricing and cost calculation:', {
      model,
      pricing,
      inputTokens,
      outputTokens,
      cost,
    });

    // Atualizar métricas (somar aos valores existentes)
    const updateResult = await query(
      `UPDATE session_metrics 
       SET 
         input_tokens = input_tokens + $1,
         output_tokens = output_tokens + $2,
         total_tokens = total_tokens + $3,
         cost_input = cost_input + $4,
         cost_output = cost_output + $5,
         cost_total = cost_total + $6,
         pricing_model = $7,
         updated_at = CURRENT_TIMESTAMP
       WHERE session_id = $8
       RETURNING input_tokens, output_tokens, total_tokens, cost_total`,
      [
        inputTokens,
        outputTokens,
        totalTokens,
        cost.input,
        cost.output,
        cost.total,
        JSON.stringify(pricing),
        dbSessionId,
      ]
    );

    console.log('[updateSessionMetrics] Update result:', {
      rowsAffected: updateResult.rowCount,
      updatedMetrics: updateResult.rows[0],
    });

    // Debitar tokens usados nesta atualização
    // IMPORTANTE: Isso soma aos tokens já debitados anteriormente
    await updateUsageTracking(userId, totalTokens, 0);
    
    console.log(`[updateSessionMetrics] ✅ Session ${sessionId} (dbId: ${dbSessionId}): +${inputTokens} input, +${outputTokens} output = ${totalTokens} total tokens. Usage tracking updated for user ${userId}.`);

    return { success: true };
  } catch (error) {
    console.error('Error updating session metrics:', error);
    throw error;
  }
}

/**
 * Finaliza uma sessão
 */
export async function finalizeSession(sessionId) {
  try {
    const result = await query(
      `UPDATE sessions 
       SET 
         end_time = NOW(),
         duration_seconds = EXTRACT(EPOCH FROM (NOW() - start_time))::INTEGER,
         status = 'completed',
         updated_at = NOW()
       WHERE session_id = $1
       RETURNING *`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      throw new Error('Session not found');
    }

    // NOTA: A sessão já foi debitada quando foi criada (em createSession)
    // Não precisamos debitar novamente aqui ao finalizar
    // Isso evita contagem duplicada de sessões

    return result.rows[0];
  } catch (error) {
    console.error('Error finalizing session:', error);
    throw error;
  }
}

/**
 * Obtém métricas de um usuário
 */
export async function getUserMetrics(userId, startDate = null, endDate = null) {
  try {
    let queryText = 'SELECT * FROM user_usage_summary WHERE user_id = $1';
    const params = [userId];

    if (startDate && endDate) {
      queryText += ` AND first_session >= $2 AND last_session <= $3`;
      params.push(startDate, endDate);
    }

    const result = await query(queryText, params);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user metrics:', error);
    throw error;
  }
}

/**
 * Obtém detalhes de uma sessão específica
 */
export async function getSessionDetails(sessionId, userId) {
  try {
    const result = await query(
      `SELECT * FROM session_details 
       WHERE session_id = $1 AND user_id = $2`,
      [sessionId, userId]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting session details:', error);
    throw error;
  }
}

/**
 * Registra um evento de uso
 */
export async function logUsageEvent(sessionId, userId, eventType, inputTokens, outputTokens, eventData) {
  try {
    // Buscar ID da sessão no banco
    const sessionResult = await query(
      'SELECT id FROM sessions WHERE session_id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      throw new Error('Session not found');
    }

    const dbSessionId = sessionResult.rows[0].id;

    await query(
      `INSERT INTO usage_events (session_id, user_id, event_type, input_tokens, output_tokens, event_data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [dbSessionId, userId, eventType, inputTokens, outputTokens, JSON.stringify(eventData || {})]
    );
  } catch (error) {
    console.error('Error logging usage event:', error);
    throw error;
  }
}

