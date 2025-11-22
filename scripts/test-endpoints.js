import 'dotenv/config';
import { query } from '../backend/src/services/database.js';
import { generateToken } from '../backend/src/services/auth.js';

// Criar token de admin para testes
const adminUser = {
  id: 'test-admin-id',
  email: 'admin@example.com',
  role: 'admin'
};

const token = generateToken(adminUser);
const API_BASE = 'http://localhost:3000/api';

async function testEndpoint(name, method, url, body = null, token = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${url}`, options);
    const data = await response.json();

    if (response.ok) {
      console.log(`✅ ${name}: OK (${response.status})`);
      return { success: true, data };
    } else {
      console.log(`❌ ${name}: FAILED (${response.status}) - ${data.error || 'Unknown error'}`);
      return { success: false, error: data.error, status: response.status };
    }
  } catch (error) {
    console.log(`❌ ${name}: ERROR - ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testAllEndpoints() {
  console.log('🧪 Testando Endpoints da API\n');
  console.log('='.repeat(60));

  // 1. Teachers
  console.log('\n📚 ENDPOINTS DE TEACHERS:');
  await testEndpoint('GET /teachers', 'GET', '/teachers');
  
  // Buscar ID da Samantha
  const teachersResult = await query('SELECT id FROM teachers LIMIT 1');
  if (teachersResult.rows.length > 0) {
    const teacherId = teachersResult.rows[0].id;
    await testEndpoint(`GET /teachers/${teacherId}/students`, 'GET', `/teachers/${teacherId}/students`);
    await testEndpoint(`GET /teachers/${teacherId}/summary`, 'GET', `/teachers/${teacherId}/summary`);
  }

  // 2. Plans
  console.log('\n📋 ENDPOINTS DE PLANOS:');
  await testEndpoint('GET /plans', 'GET', '/plans');
  
  const plansResult = await query('SELECT id FROM user_plans LIMIT 1');
  if (plansResult.rows.length > 0) {
    const planId = plansResult.rows[0].id;
    await testEndpoint(`GET /plans/admin/plans/${planId}`, 'GET', `/plans/admin/plans/${planId}`, null, token);
  }

  // 3. Subscriptions
  console.log('\n🔗 ENDPOINTS DE SUBSCRIPTIONS:');
  const usersResult = await query("SELECT id FROM users WHERE role = 'student' LIMIT 1");
  if (usersResult.rows.length > 0) {
    const userId = usersResult.rows[0].id;
    await testEndpoint(`GET /subscriptions/user/${userId}`, 'GET', `/subscriptions/user/${userId}`, null, token);
  }

  // 4. Users (Admin)
  console.log('\n👥 ENDPOINTS DE USERS (Admin):');
  await testEndpoint('GET /users/admin/users', 'GET', '/users/admin/users', null, token);

  // 5. Sessions (Admin)
  console.log('\n📊 ENDPOINTS DE SESSIONS (Admin):');
  await testEndpoint('GET /sessions/admin/sessions', 'GET', '/sessions/admin/sessions', null, token);

  // 6. Metrics (Admin)
  console.log('\n📈 ENDPOINTS DE METRICS (Admin):');
  await testEndpoint('GET /metrics/admin/stats/users', 'GET', '/metrics/admin/stats/users', null, token);
  await testEndpoint('GET /metrics/admin/stats/overview', 'GET', '/metrics/admin/stats/overview', null, token);
  await testEndpoint('GET /metrics/admin/stats/costs', 'GET', '/metrics/admin/stats/costs', null, token);
  
  // 7. Sessions Stats (Admin)
  console.log('\n📊 ENDPOINTS DE SESSIONS STATS (Admin):');
  await testEndpoint('GET /sessions/admin/sessions/stats', 'GET', '/sessions/admin/sessions/stats', null, token);

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Testes concluídos!\n');
}

// Verificar se o servidor está rodando
fetch('http://localhost:3000/health')
  .then(res => res.json())
  .then(() => {
    testAllEndpoints().then(() => process.exit(0));
  })
  .catch(() => {
    console.error('❌ Servidor não está rodando na porta 3000');
    process.exit(1);
  });

