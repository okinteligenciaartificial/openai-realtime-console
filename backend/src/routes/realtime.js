import express from 'express';
import 'dotenv/config';
import { request as undiciRequest } from 'undici';
import { authenticateToken } from '../middleware/auth.js';
import { createSession, updateSessionMetrics } from '../services/metrics.js';
import { checkSessionLimit } from '../services/limits.js';

const router = express.Router();

const apiKey = process.env.OPENAI_API_KEY;

/**
 * Valida se a API key está configurada e tem formato válido
 */
function validateApiKey() {
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }
  if (!apiKey.startsWith('sk-')) {
    throw new Error('OpenAI API key format invalid (should start with sk-)');
  }
  return true;
}

/**
 * Valida o formato do SDP (Session Description Protocol)
 */
function validateSdp(sdp) {
  if (!sdp || typeof sdp !== 'string') {
    throw new Error('SDP must be a non-empty string');
  }

  const trimmedSdp = sdp.trim();
  if (trimmedSdp.length === 0) {
    throw new Error('SDP cannot be empty');
  }

  // Verificar campos obrigatórios do SDP
  const requiredFields = ['v=', 'm=', 'o='];
  const missingFields = requiredFields.filter(field => !trimmedSdp.includes(field));

  if (missingFields.length > 0) {
    throw new Error(`Invalid SDP format: missing required fields (${missingFields.join(', ')})`);
  }

  // Verificar se começa com v= (versão)
  if (!trimmedSdp.startsWith('v=')) {
    throw new Error('Invalid SDP format: must start with v=');
  }

  return trimmedSdp;
}

/**
 * Cria a configuração da sessão Realtime
 * @param {Object} options - Opções de customização
 * @returns {string} JSON string da configuração
 */
function createSessionConfig(options = {}) {
  const config = {
    session: {
      type: "realtime",
      model: options.model || "gpt-4o-mini-realtime-preview",
      instructions: options.instructions || `# ROLE AND IDENTITY
You are Samantha, an experienced English teacher conducting oral proficiency tests for students. You are professional, patient, and neutral in your assessment approach.

# CORE MISSION
Conduct structured English oral tests by following provided questions sequentially, evaluating student responses objectively, and generating comprehensive assessment data.

# CONVERSATION MODE
When no test data is provided, engage in natural English conversation practice with the student. Help them improve their speaking skills through:
- Casual conversation about daily topics
- Pronunciation correction (gentle)
- Vocabulary expansion suggestions
- Grammar guidance when appropriate
- Encouraging longer, more detailed responses

Be friendly, supportive, and create a comfortable learning environment.`,
      audio: {
        output: {
          voice: options.voice || "marin",
        },
      },
    },
  };

  // Validar estrutura antes de stringify
  if (!config.session.type || !config.session.model) {
    throw new Error('Invalid session config: missing required fields');
  }

  try {
    return JSON.stringify(config);
  } catch (error) {
    throw new Error(`Failed to stringify session config: ${error.message}`);
  }
}

/**
 * Valida a configuração da sessão
 */
function validateSessionConfig(configString) {
  try {
    const parsed = JSON.parse(configString);
    if (!parsed.session) {
      throw new Error('Session config must have a session object');
    }
    if (!parsed.session.type || parsed.session.type !== 'realtime') {
      throw new Error('Session config must have type: "realtime"');
    }
    if (!parsed.session.model) {
      throw new Error('Session config must have a model');
    }
    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in session config: ${error.message}`);
    }
    throw error;
  }
}

/**
 * GET /api/realtime/token
 * Obter token para sessão Realtime (requer autenticação)
 * 
 * Este endpoint gera um client_secret temporário que o frontend usa
 * para estabelecer conexão WebRTC diretamente com a API da OpenAI
 */
router.get('/token', authenticateToken, async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Validar API key
    validateApiKey();

    // Criar configuração da sessão
    const sessionConfig = createSessionConfig();

    // Validar configuração antes de enviar
    validateSessionConfig(sessionConfig);

    console.log('[Realtime] Generating token for user:', req.userId);

    // Fazer requisição para API da OpenAI
    const response = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: sessionConfig,
      },
    );

    const duration = Date.now() - startTime;

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
        console.error('[Realtime] Token generation failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText.substring(0, 200),
          duration,
        });

        // Tentar parsear erro JSON
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error && errorJson.error.message) {
            throw new Error(`OpenAI API error: ${errorJson.error.message}`);
          }
        } catch {
          // Não é JSON válido, usar texto direto
        }

        throw new Error(`OpenAI API error: ${response.status} - ${errorText.substring(0, 100)}`);
      } catch (error) {
        if (error.message.includes('OpenAI API error')) {
          throw error;
        }
        throw new Error(`Failed to read error response: ${error.message}`);
      }
    }

    const data = await response.json();
    
    // SIMPLIFICADO: Retornar exatamente o que a API retorna
    // O frontend vai lidar com o formato
    console.log('[Realtime] Token response from OpenAI:', {
      keys: Object.keys(data),
      hasClientSecret: !!data.client_secret,
    });

    // Retornar resposta exata da API
    res.json(data);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("[Realtime] Token generation error:", {
      userId: req.userId,
      error: error.message,
      duration,
    });
    
    const statusCode = error.message.includes('not configured') || 
                      error.message.includes('format invalid') ? 500 : 500;
    
    res.status(statusCode).json({ 
      error: "Failed to generate token: " + error.message 
    });
  }
});

/**
 * POST /api/realtime/session
 * Criar sessão Realtime (requer autenticação)
 * 
 * Este endpoint recebe um SDP offer do frontend e retorna um SDP answer
 * da API da OpenAI, estabelecendo uma conexão WebRTC
 * 
 * Body deve ser o SDP como string (text/plain)
 * 
 * Query params opcionais:
 * - client_secret: chave ephemeral para usar em vez da API key (recomendado)
 */
router.post('/session', authenticateToken, express.text({ type: '*/*' }), async (req, res) => {
  const startTime = Date.now();
  let dbSessionId = null;
  let sessionId = null;

  try {
    // Validar API key
    validateApiKey();

    const userId = req.userId;
    console.log('[Realtime] Creating session for user:', userId);

    // Validar e processar SDP
    let offerSdp = validateSdp(req.body);
    
    // Garantir que o SDP termina com uma nova linha (requisito do formato SDP)
    if (!offerSdp.endsWith('\n') && !offerSdp.endsWith('\r\n')) {
      offerSdp = offerSdp + '\r\n';
    }
    
    console.log('[Realtime] SDP validated:', {
      length: offerSdp.length,
      preview: offerSdp.substring(0, 100) + '...',
      endsWith: offerSdp.substring(Math.max(0, offerSdp.length - 50)),
      hasNewlines: offerSdp.includes('\n'),
      lineCount: offerSdp.split('\n').length,
      endsWithNewline: offerSdp.endsWith('\n') || offerSdp.endsWith('\r\n'),
    });

    // Verificar limites antes de criar sessão
    const sessionLimitCheck = await checkSessionLimit(userId);
    if (!sessionLimitCheck.allowed) {
      console.warn('[Realtime] Session limit check failed:', {
        userId,
        reason: sessionLimitCheck.reason,
        current: sessionLimitCheck.current,
        limit: sessionLimitCheck.limit,
      });
      return res.status(403).json({
        error: 'Session limit exceeded',
        details: sessionLimitCheck,
      });
    }

    if (sessionLimitCheck.warning) {
      console.warn('[Realtime] Session limit warning:', sessionLimitCheck.warning);
    }

    // Gerar session_id único
    sessionId = `realtime-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Criar sessão no banco ANTES de chamar API OpenAI
    // Isso garante que temos registro mesmo se a API falhar
    try {
      const dbSession = await createSession(userId, sessionId, 'gpt-4o-mini-realtime-preview');
      dbSessionId = dbSession.id;
      console.log('[Realtime] Session created in database:', {
        dbSessionId,
        sessionId,
        userId,
      });
    } catch (dbError) {
      // Se já existe, usar o existente
      if (dbError.code === '23505') { // Unique violation
        console.warn('[Realtime] Session already exists, continuing...');
      } else {
        throw new Error(`Failed to create session in database: ${dbError.message}`);
      }
    }

    // Na API GA, o endpoint /v1/realtime/calls aceita apenas o SDP como texto
    // Content-Type deve ser application/sdp
    // A configuração da sessão é feita via WebSocket após a conexão WebRTC ser estabelecida
    // NÃO usa mais multipart/form-data!
    console.log('[Realtime] Sending SDP to OpenAI API (GA format):', {
      sdpLength: offerSdp.length,
      sdpPreview: offerSdp.substring(0, 100) + '...',
      sdpEnd: offerSdp.substring(Math.max(0, offerSdp.length - 50)),
    });

    // Obter client_secret se fornecido (recomendado)
    // O endpoint /v1/realtime/calls funciona melhor com client_secret (ephemeral key)
    // O frontend deve passar o client_secret_value obtido do endpoint /token
    // Express normaliza headers para lowercase, então usar 'x-client-secret'
    const clientSecret = req.query.client_secret || req.headers['x-client-secret'] || req.headers['X-Client-Secret'];
    
    console.log('[Realtime] Client secret check:', {
      hasQueryParam: !!req.query.client_secret,
      hasHeaderXClientSecret: !!req.headers['x-client-secret'],
      hasHeaderXClientSecretUpper: !!req.headers['X-Client-Secret'],
      allHeaders: Object.keys(req.headers).filter(h => h.toLowerCase().includes('client')),
      queryParams: Object.keys(req.query),
      clientSecretReceived: !!clientSecret,
    });
    
    // IMPORTANTE: O endpoint /v1/realtime/calls requer client_secret (ephemeral key)
    // Não aceita API key direta. Se não tiver client_secret, retornar erro claro
    if (!clientSecret) {
      console.error('[Realtime] Client secret is required for /v1/realtime/calls endpoint', {
        query: req.query,
        headers: Object.keys(req.headers).filter(h => h.toLowerCase().includes('client')),
      });
      return res.status(400).json({
        error: 'Client secret (ephemeral key) is required. Please call /api/realtime/token first to obtain it.',
      });
    }
    
    const authKey = clientSecret;
    
    console.log('[Realtime] Request details:', {
      url: 'https://api.openai.com/v1/realtime/calls',
      method: 'POST',
      contentType: 'application/sdp',
      bodyLength: offerSdp.length,
      usingClientSecret: !!clientSecret,
      authKeyPrefix: authKey.substring(0, 7) + '...',
      sdpFirstLine: offerSdp.split('\n')[0],
      sdpLastLine: offerSdp.split('\n').filter(l => l.trim()).pop(),
    });

    // Fazer requisição para API da OpenAI
    // API GA: body é apenas o SDP como texto, Content-Type: application/sdp
    // Usar client_secret (ephemeral key) se disponível, senão usar API key
    // IMPORTANTE: Usar fetch nativo em vez de undiciRequest para garantir que o texto seja enviado corretamente
    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authKey}`,
        "Content-Type": "application/sdp",
      },
      body: offerSdp,
    });

    const duration = Date.now() - startTime;
    console.log('[Realtime] OpenAI API response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      duration,
      sessionId,
    });

    if (!response.ok) {
      let errorText = '';
      let errorJson = null;
      
      try {
        errorText = await response.text();
        console.error('[Realtime] Session creation failed:', {
          status: response.status,
          statusText: response.statusText,
          errorRaw: errorText,
          errorLength: errorText.length,
          duration,
          sessionId,
        });

        // Tentar parsear erro JSON
        try {
          errorJson = JSON.parse(errorText);
          console.error('[Realtime] Parsed error JSON:', JSON.stringify(errorJson, null, 2));
        } catch (parseError) {
          console.error('[Realtime] Error is not valid JSON:', parseError.message);
        }

        const status = response.status || 'unknown';
        let errorMessage = `OpenAI API error: ${status}`;
        
        if (errorJson && errorJson.error) {
          if (errorJson.error.message && errorJson.error.message.trim()) {
            errorMessage = errorJson.error.message;
          } else if (errorJson.error.code) {
            errorMessage = `OpenAI API error (${errorJson.error.code}): ${errorJson.error.type || 'Unknown error'}`;
          } else if (typeof errorJson.error === 'string' && errorJson.error.trim()) {
            errorMessage = errorJson.error;
          } else {
            // Se a mensagem está vazia, pode ser um problema de formato
            // Erro 400 com mensagem vazia geralmente indica formato incorreto do SDP ou headers
            errorMessage = `OpenAI API error: ${status} - Invalid request format (empty error message). This usually means the SDP format is incorrect or required headers are missing.`;
          }
        } else if (errorText && errorText.trim()) {
          // Não é JSON válido, usar texto direto (limitado)
          errorMessage = errorText.substring(0, 200);
        } else {
          errorMessage = `OpenAI API error: ${status} - Empty response body`;
        }

        throw new Error(errorMessage);
      } catch (error) {
        if (error.message.includes('OpenAI API error') || error.message.length > 0) {
          throw error;
        }
        throw new Error(`Failed to read error response: ${error.message}`);
      }
    }

    // Ler resposta (SDP answer)
    // undici.request retorna um objeto com body que precisa ser lido
        const answerSdp = await response.text();

    if (!answerSdp || answerSdp.trim().length === 0) {
      throw new Error('Received empty SDP answer from OpenAI');
    }

    // Validar que a resposta parece ser um SDP válido
    if (!answerSdp.includes('v=') || !answerSdp.includes('m=')) {
      console.warn('[Realtime] Received response that may not be valid SDP:', {
        length: answerSdp.length,
        preview: answerSdp.substring(0, 100),
      });
    }

        console.log('[Realtime] Session created successfully:', {
          sessionId,
          dbSessionId,
          answerSdpLength: answerSdp.length,
          duration,
        });

    // Retornar SDP answer como texto
    // IMPORTANTE: Incluir sessionId no header para o frontend usar
    res.set('Content-Type', 'text/plain');
    res.set('X-Session-Id', sessionId);
    res.send(answerSdp);

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("[Realtime] Session creation error:", {
      userId: req.userId,
      sessionId,
      dbSessionId,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      duration,
    });

    // Determinar código de status apropriado
    let statusCode = 500;
    if (error.message.includes('must be') || 
        error.message.includes('cannot be') ||
        error.message.includes('Invalid') ||
        error.message.includes('missing')) {
      statusCode = 400; // Bad Request
    } else if (error.message.includes('limit exceeded') || 
               error.message.includes('Forbidden')) {
      statusCode = 403; // Forbidden
    } else if (error.message.includes('not configured') || 
               error.message.includes('format invalid')) {
      statusCode = 500; // Internal Server Error
    } else if (error.message.includes('OpenAI API error: 401')) {
      statusCode = 500; // Internal (API key issue)
    } else if (error.message.includes('OpenAI API error: 429')) {
      statusCode = 503; // Service Unavailable (rate limit)
    } else if (error.message.includes('OpenAI API error: 4')) {
      statusCode = 502; // Bad Gateway (client error from OpenAI)
    } else if (error.message.includes('OpenAI API error: 5')) {
      statusCode = 502; // Bad Gateway (server error from OpenAI)
    }

    res.status(statusCode).json({ 
      error: "Failed to create session: " + error.message 
    });
  }
});

/**
 * POST /api/realtime/events/:sessionId
 * Receber eventos da sessão Realtime e processar tokens
 * 
 * Este endpoint recebe eventos do frontend e processa tokens quando
 * os eventos contêm informações de uso (usage)
 * BACKEND faz 100% da lógica de contabilização
 */
router.post('/events/:sessionId', authenticateToken, express.json(), async (req, res) => {
  console.log('[Realtime] ⚡ ENDPOINT CALLED - /events/:sessionId', {
    sessionId: req.params.sessionId,
    method: req.method,
    contentType: req.headers['content-type'],
    bodySize: JSON.stringify(req.body).length,
  });
  
  try {
    const { sessionId } = req.params;
    const event = req.body;
    
    console.log('[Realtime] Event received (FULL):', {
      sessionId,
      eventType: event.type,
      hasUsage: !!event.usage,
      hasResponseUsage: !!(event.response && event.response.usage),
      eventKeys: Object.keys(event),
      responseKeys: event.response ? Object.keys(event.response) : null,
      fullEvent: JSON.stringify(event, null, 2).substring(0, 1000), // Primeiros 1000 chars para debug
    });
    
    // Processar eventos que contêm informações de uso
    // IMPORTANTE: Na API Realtime GA há dois tipos de custos:
    // 1. Per-Response costs: response.usage em response.done (custo da resposta do modelo)
    // 2. Input transcription costs: usage em conversation.item.input_audio_transcription.completed (custo da transcrição)
    // Ambos devem ser processados e debitados
    let inputTokens = 0;
    let outputTokens = 0;
    let usage = null;
    
    // Verificar diferentes formatos possíveis
    if (event.usage) {
      // Formato direto: event.usage (para eventos de transcrição)
      usage = event.usage;
    } else if (event.response && event.response.usage) {
      // Formato correto: response.done tem response.usage (custo da resposta)
      usage = event.response.usage;
    } else if (event.input_tokens !== undefined || event.output_tokens !== undefined) {
      // Formato alternativo: tokens direto no evento
      inputTokens = parseInt(event.input_tokens || 0, 10);
      outputTokens = parseInt(event.output_tokens || 0, 10);
      console.log('[Realtime] Found tokens directly in event:', {
        eventType: event.type,
        inputTokens,
        outputTokens,
      });
    }
    
    if (usage) {
      inputTokens = parseInt(usage.input_tokens || 0, 10);
      outputTokens = parseInt(usage.output_tokens || 0, 10);
      console.log('[Realtime] Found usage in event:', {
        eventType: event.type,
        usageLocation: event.response ? 'response.usage' : 'usage',
        inputTokens,
        outputTokens,
        usage: usage,
      });
    }
    
    // Processar se houver tokens OU se houver usage (mesmo que tokens sejam 0)
    // Isso garante que eventos de transcrição e response.done sejam sempre processados
    if (usage || inputTokens > 0 || outputTokens > 0) {
      console.log('[Realtime] Processing tokens from event:', {
        sessionId,
        eventType: event.type,
        inputTokens,
        outputTokens,
        total: inputTokens + outputTokens,
        hasUsage: !!usage,
      });
      
      try {
        // Atualizar métricas no backend (100% da lógica aqui)
        // Mesmo que tokens sejam 0, atualizar para registrar que o evento foi processado
        await updateSessionMetrics(sessionId, inputTokens, outputTokens);
        
        console.log('[Realtime] ✅ Tokens processed and debited successfully:', {
          sessionId,
          eventType: event.type,
          inputTokens,
          outputTokens,
          total: inputTokens + outputTokens,
        });
      } catch (metricsError) {
        console.error('[Realtime] ❌ Error updating metrics:', {
          sessionId,
          eventType: event.type,
          error: metricsError.message,
          stack: metricsError.stack,
        });
        // Não falhar a requisição, apenas logar o erro
        // O frontend não precisa saber se houve erro no processamento
      }
    } else {
      console.log('[Realtime] ⚠️ Event skipped (no usage or tokens):', {
        sessionId,
        eventType: event.type,
        hasUsage: !!event.usage,
        hasResponseUsage: !!(event.response && event.response.usage),
        inputTokens,
        outputTokens,
        eventKeys: Object.keys(event),
      });
    }
    
    // Sempre retornar sucesso (mesmo se não houver tokens para processar)
    res.json({ success: true });
  } catch (error) {
    console.error('[Realtime] ❌ Error processing event:', {
      sessionId: req.params.sessionId,
      error: error.message,
      stack: error.stack,
    });
    // Não falhar a requisição, apenas logar o erro
    // O frontend não precisa saber se houve erro no processamento
    res.status(200).json({ success: false, error: error.message });
  }
});

export default router;
