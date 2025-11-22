import { query } from './database.js';
import { getPricingForModel, calculateCost } from './pricing.js';
import { updateSessionMetrics } from './metrics.js';

/**
 * Salvar uma mensagem da conversa
 * @param {string} sessionId - ID da sessão (session_id string, não UUID)
 * @param {string} userId - ID do usuário (UUID)
 * @param {string} role - Papel: 'user' ou 'assistant'
 * @param {string} content - Conteúdo da mensagem
 * @param {Object} options - Opções adicionais
 */
export async function saveMessage(sessionId, userId, role, content, options = {}) {
  try {
    // Buscar o ID da sessão no banco (UUID)
    const sessionResult = await query(
      'SELECT id FROM sessions WHERE session_id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const dbSessionId = sessionResult.rows[0].id;

    // Buscar modelo da sessão para calcular custo
    const sessionModelResult = await query(
      'SELECT model FROM sessions WHERE id = $1',
      [dbSessionId]
    );
    const model = sessionModelResult.rows[0]?.model || 'gpt-4o-mini-realtime-preview';

    // Extrair tokens do eventData se disponível
    let inputTokens = 0;
    let outputTokens = 0;
    let costInput = 0;
    let costOutput = 0;
    let costTotal = 0;

    if (options.eventData) {
      console.log('[saveMessage] Processing eventData:', {
        eventType: options.eventType,
        hasEventData: !!options.eventData,
        hasUsage: !!options.eventData.usage,
        hasResponse: !!options.eventData.response,
        hasResponseUsage: !!(options.eventData.response && options.eventData.response.usage),
        eventDataKeys: Object.keys(options.eventData),
        responseKeys: options.eventData.response ? Object.keys(options.eventData.response) : null,
      });
      
      // Tentar extrair usage de diferentes formatos
      let usage = null;
      if (options.eventData.usage && typeof options.eventData.usage === 'object') {
        // Criar uma cópia do objeto usage para garantir que temos as propriedades
        usage = {
          input_tokens: options.eventData.usage.input_tokens,
          output_tokens: options.eventData.usage.output_tokens,
        };
        console.log('[saveMessage] Found usage in eventData.usage:', {
          original: options.eventData.usage,
          copied: usage,
          hasInputTokens: 'input_tokens' in options.eventData.usage,
          hasOutputTokens: 'output_tokens' in options.eventData.usage,
        });
      } else if (options.eventData.response && options.eventData.response.usage && typeof options.eventData.response.usage === 'object') {
        // Criar uma cópia do objeto usage para garantir que temos as propriedades
        usage = {
          input_tokens: options.eventData.response.usage.input_tokens,
          output_tokens: options.eventData.response.usage.output_tokens,
        };
        console.log('[saveMessage] Found usage in eventData.response.usage:', {
          original: options.eventData.response.usage,
          copied: usage,
          hasInputTokens: 'input_tokens' in options.eventData.response.usage,
          hasOutputTokens: 'output_tokens' in options.eventData.response.usage,
        });
      }

      // Verificar se usage existe e tem tokens válidos (não apenas um objeto vazio)
      if (usage && typeof usage === 'object') {
        // Tentar extrair tokens mesmo se o objeto parecer vazio
        // Às vezes o usage vem como {} mas ainda tem as propriedades
        inputTokens = parseInt(usage.input_tokens || 0, 10);
        outputTokens = parseInt(usage.output_tokens || 0, 10);
        
        // Verificar se o objeto usage tem propriedades de tokens OU se conseguimos extrair tokens
        const hasTokens = ('input_tokens' in usage || 'output_tokens' in usage) || (inputTokens > 0 || outputTokens > 0);
        
        console.log('[saveMessage] Checking usage for tokens:', {
          usage: usage,
          usageKeys: Object.keys(usage),
          usageStringified: JSON.stringify(usage),
          hasTokens,
          inputTokens,
          outputTokens,
          hasInputTokens: 'input_tokens' in usage,
          hasOutputTokens: 'output_tokens' in usage,
        });
        
        if (hasTokens && (inputTokens > 0 || outputTokens > 0)) {
          console.log('[saveMessage] ✅ Extracted tokens from usage:', {
            inputTokens,
            outputTokens,
            total: inputTokens + outputTokens,
            usage: usage,
          });
          
          // Calcular custo se houver tokens
          try {
            const pricing = await getPricingForModel(model);
            const cost = calculateCost(inputTokens, outputTokens, pricing);
            costInput = cost.input;
            costOutput = cost.output;
            costTotal = cost.total;
            
            console.log('[saveMessage] ✅ Cost calculated:', {
              model,
              inputTokens,
              outputTokens,
              cost,
            });
          } catch (error) {
            console.warn('[saveMessage] ❌ Error calculating cost:', error);
          }
        } else {
          console.log('[saveMessage] ⚠️ Usage found but no valid tokens:', {
            usage: usage,
            usageKeys: Object.keys(usage),
            inputTokens,
            outputTokens,
            hasTokens,
          });
        }
      } else {
        console.log('[saveMessage] ⚠️ No valid usage found in eventData:', {
          hasEventData: !!options.eventData,
          hasUsage: !!options.eventData?.usage,
          hasResponseUsage: !!(options.eventData?.response && options.eventData?.response?.usage),
          eventType: options.eventType,
          eventDataKeys: options.eventData ? Object.keys(options.eventData) : null,
        });
      }
    }

    // Obter o próximo número sequencial para esta sessão
    const sequenceResult = await query(
      `SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_sequence
       FROM conversation_messages
       WHERE session_id = $1`,
      [dbSessionId]
    );

    const sequenceNumber = parseInt(sequenceResult.rows[0].next_sequence, 10);

    // Inserir mensagem com custo
    const result = await query(
      `INSERT INTO conversation_messages 
       (session_id, user_id, role, content, message_type, event_type, event_data, sequence_number, 
        input_tokens, output_tokens, total_tokens, cost_input, cost_output, cost_total, additional_attributes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id, created_at, sequence_number, cost_total`,
      [
        dbSessionId,
        userId,
        role,
        content,
        options.messageType || 'text',
        options.eventType || null,
        options.eventData ? JSON.stringify(options.eventData) : null,
        sequenceNumber,
        inputTokens,
        outputTokens,
        inputTokens + outputTokens,
        costInput,
        costOutput,
        costTotal,
        options.additionalAttributes ? JSON.stringify(options.additionalAttributes) : '{}',
      ]
    );

    console.log('[saveMessage] Message saved:', {
      sessionId,
      dbSessionId,
      role,
      contentLength: content.length,
      sequenceNumber,
      messageId: result.rows[0].id,
      inputTokens,
      outputTokens,
      costTotal: result.rows[0].cost_total,
    });

    // IMPORTANTE: Se a mensagem tem custo, atualizar também o session_metrics
    // Isso garante que o cost_total da sessão seja atualizado
    if (costTotal > 0 && (inputTokens > 0 || outputTokens > 0)) {
      try {
        console.log('[saveMessage] Updating session_metrics with message costs:', {
          sessionId,
          inputTokens,
          outputTokens,
          costTotal,
        });
        await updateSessionMetrics(sessionId, inputTokens, outputTokens);
        console.log('[saveMessage] ✅ Session metrics updated');
      } catch (error) {
        console.warn('[saveMessage] ⚠️ Error updating session metrics (non-fatal):', error.message);
        // Não falhar a operação se houver erro ao atualizar métricas
      }
    }

    return result.rows[0];
  } catch (error) {
    console.error('[saveMessage] Error saving message:', error);
    throw error;
  }
}

/**
 * Obter histórico de mensagens de uma sessão
 * @param {string} sessionId - ID da sessão (session_id string, não UUID)
 * @param {string} userId - ID do usuário (UUID) para verificação de permissão
 * @param {Object} options - Opções de paginação
 */
export async function getConversationHistory(sessionId, userId, options = {}) {
  try {
    const { limit = 1000, offset = 0 } = options;

    // Buscar o ID da sessão no banco (UUID)
    const sessionResult = await query(
      'SELECT id, user_id FROM sessions WHERE session_id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const dbSessionId = sessionResult.rows[0].id;
    const sessionUserId = sessionResult.rows[0].user_id;

    // Verificar se o usuário tem permissão para ver esta sessão
    if (sessionUserId !== userId) {
      throw new Error('Forbidden: User does not have access to this session');
    }

    // Buscar mensagens ordenadas por sequência (incluindo custos)
    const result = await query(
      `SELECT 
        id,
        role,
        content,
        message_type,
        event_type,
        sequence_number,
        input_tokens,
        output_tokens,
        total_tokens,
        cost_input,
        cost_output,
        cost_total,
        created_at,
        additional_attributes
       FROM conversation_messages
       WHERE session_id = $1
       ORDER BY sequence_number ASC, created_at ASC
       LIMIT $2 OFFSET $3`,
      [dbSessionId, limit, offset]
    );

    console.log('[getConversationHistory] Messages retrieved:', {
      sessionId,
      dbSessionId,
      count: result.rows.length,
    });

    return result.rows;
  } catch (error) {
    console.error('[getConversationHistory] Error getting conversation history:', error);
    throw error;
  }
}

/**
 * Obter estatísticas de uma conversa
 * @param {string} sessionId - ID da sessão (session_id string, não UUID)
 * @param {string} userId - ID do usuário (UUID) para verificação de permissão
 */
export async function getConversationStats(sessionId, userId) {
  try {
    // Buscar o ID da sessão no banco (UUID)
    const sessionResult = await query(
      'SELECT id, user_id FROM sessions WHERE session_id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const dbSessionId = sessionResult.rows[0].id;
    const sessionUserId = sessionResult.rows[0].user_id;

    // Verificar se o usuário tem permissão para ver esta sessão
    if (sessionUserId !== userId) {
      throw new Error('Forbidden: User does not have access to this session');
    }

    // Buscar estatísticas (incluindo custos)
    const result = await query(
      `SELECT 
        COUNT(*) as total_messages,
        COUNT(CASE WHEN role = 'user' THEN 1 END) as user_messages,
        COUNT(CASE WHEN role = 'assistant' THEN 1 END) as assistant_messages,
        COALESCE(SUM(input_tokens), 0) as total_input_tokens,
        COALESCE(SUM(output_tokens), 0) as total_output_tokens,
        COALESCE(SUM(total_tokens), 0) as total_tokens,
        COALESCE(SUM(cost_total), 0) as total_cost,
        MIN(created_at) as first_message_at,
        MAX(created_at) as last_message_at
       FROM conversation_messages
       WHERE session_id = $1`,
      [dbSessionId]
    );

    return result.rows[0];
  } catch (error) {
    console.error('[getConversationStats] Error getting conversation stats:', error);
    throw error;
  }
}

