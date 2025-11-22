import testPool from '../../src/config/test-database.js';
import { hashPassword, generateToken } from '../../src/services/auth.js';

/**
 * Criar banco de teste e executar migrations
 */
export async function setupTestDB() {
  // As migrations devem ser executadas manualmente ou via script
  // Este helper apenas garante que o banco está pronto
  try {
    await testPool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Test database not ready:', error);
    throw error;
  }
}

/**
 * Limpar dados do banco de teste
 */
export async function cleanupTestDB() {
  const tables = [
    'usage_events',
    'session_metrics',
    'sessions',
    'usage_limits_tracking',
    'user_subscriptions',
    'teachers',
    'user_plans',
    'users',
  ];

  for (const table of tables) {
    await testPool.query(`TRUNCATE TABLE ${table} CASCADE`);
  }
}

/**
 * Criar usuário de teste
 */
export async function createTestUser(role = 'student', overrides = {}) {
  const email = overrides.email || `test_${Date.now()}@example.com`;
  const name = overrides.name || `Test User ${Date.now()}`;
  const password = overrides.password || 'TestPassword123!';
  
  const passwordHash = await hashPassword(password);
  
  const result = await testPool.query(
    `INSERT INTO users (email, name, password_hash, role, is_active)
     VALUES ($1, $2, $3, $4, true)
     RETURNING id, email, name, role, is_active, created_at`,
    [email, name, passwordHash, role]
  );

  return {
    ...result.rows[0],
    password, // Incluir senha em texto para uso nos testes
  };
}

/**
 * Gerar token JWT para testes
 */
export function getAuthToken(user) {
  return generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });
}

/**
 * Criar professor de teste
 */
export async function createTestTeacher(userId = null, overrides = {}) {
  if (!userId) {
    const user = await createTestUser('teacher');
    userId = user.id;
  }

  const teacherCode = overrides.teacher_code || `TEST${Date.now()}`;
  const imageUrl = overrides.image_url || '/assets/test-teacher.jpg';

  const result = await testPool.query(
    `INSERT INTO teachers (user_id, teacher_code, image_url, additional_attributes)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, teacher_code, image_url, created_at`,
    [userId, teacherCode, imageUrl, JSON.stringify(overrides.additional_attributes || {})]
  );

  return result.rows[0];
}

/**
 * Criar plano de teste
 */
export async function createTestPlan(overrides = {}) {
  const name = overrides.name || `Test Plan ${Date.now()}`;
  const monthlyTokenLimit = overrides.monthly_token_limit ?? 100000;
  const monthlySessionLimit = overrides.monthly_session_limit ?? 10;
  const costPerToken = overrides.cost_per_token ?? 0.00000075;

  const result = await testPool.query(
    `INSERT INTO user_plans (name, monthly_token_limit, monthly_session_limit, cost_per_token, is_active, additional_attributes)
     VALUES ($1, $2, $3, $4, true, $5)
     RETURNING id, name, monthly_token_limit, monthly_session_limit, cost_per_token, is_active, created_at`,
    [
      name,
      monthlyTokenLimit,
      monthlySessionLimit,
      costPerToken,
      JSON.stringify(overrides.additional_attributes || {}),
    ]
  );

  return result.rows[0];
}

/**
 * Criar subscription de teste
 */
export async function createTestSubscription(userId, planId, teacherId = null, overrides = {}) {
  const result = await testPool.query(
    `INSERT INTO user_subscriptions (user_id, plan_id, teacher_id, is_active, start_date, additional_attributes)
     VALUES ($1, $2, $3, true, NOW(), $4)
     RETURNING id, user_id, plan_id, teacher_id, is_active, start_date, created_at`,
    [
      userId,
      planId,
      teacherId,
      JSON.stringify(overrides.additional_attributes || {}),
    ]
  );

  return result.rows[0];
}

/**
 * Criar sessão de teste
 */
export async function createTestSession(userId, overrides = {}) {
  const sessionId = overrides.session_id || `test-session-${Date.now()}`;
  const model = overrides.model || 'gpt-4o-mini-realtime-preview';
  const status = overrides.status || 'active';

  const result = await testPool.query(
    `INSERT INTO sessions (user_id, session_id, model, start_time, status, additional_attributes)
     VALUES ($1, $2, $3, NOW(), $4, $5)
     RETURNING id, user_id, session_id, model, start_time, status, created_at`,
    [
      userId,
      sessionId,
      model,
      status,
      JSON.stringify(overrides.additional_attributes || {}),
    ]
  );

  return result.rows[0];
}

/**
 * Criar métricas de sessão de teste
 */
export async function createTestSessionMetrics(sessionId, overrides = {}) {
  const inputTokens = overrides.input_tokens ?? 1000;
  const outputTokens = overrides.output_tokens ?? 500;
  const totalTokens = inputTokens + outputTokens;
  const costInput = overrides.cost_input ?? (inputTokens / 1000000) * 0.15;
  const costOutput = overrides.cost_output ?? (outputTokens / 1000000) * 0.60;
  const costTotal = costInput + costOutput;

  const result = await testPool.query(
    `INSERT INTO session_metrics (session_id, input_tokens, output_tokens, total_tokens, cost_input, cost_output, cost_total, pricing_model, additional_attributes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, session_id, input_tokens, output_tokens, total_tokens, cost_input, cost_output, cost_total, created_at`,
    [
      sessionId,
      inputTokens,
      outputTokens,
      totalTokens,
      costInput,
      costOutput,
      costTotal,
      JSON.stringify(overrides.pricing_model || {}),
      JSON.stringify(overrides.additional_attributes || {}),
    ]
  );

  return result.rows[0];
}

