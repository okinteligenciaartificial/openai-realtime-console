import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import testPool from '../src/config/test-database.js';
import { query } from '../src/services/database.js';

// Executar migrations no banco de teste antes de todos os testes
beforeAll(async () => {
  try {
    // Usar o mesmo usuário do banco principal
    const dbUser = process.env.DB_USER || process.env.USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || '';
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || 5432;
    
    // Tentar conectar ao banco padrão (postgres) ou ao banco principal
    // Se não conseguir, tentar sem especificar banco (conecta ao banco padrão do usuário)
    let adminPool;
    const testDbName = process.env.TEST_DATABASE_NAME || `${process.env.DB_NAME || 'transition2english'}_test`;
    
    // Tentar conectar ao banco 'postgres' primeiro
    try {
      adminPool = new (await import('pg')).Pool({
        host: dbHost,
        port: dbPort,
        database: 'postgres',
        user: dbUser,
        password: dbPassword,
      });
      await adminPool.query('SELECT 1');
    } catch (err) {
      // Se falhar, tentar conectar ao banco principal
      try {
        const mainDbName = process.env.DB_NAME || 'transition2english';
        adminPool = new (await import('pg')).Pool({
          host: dbHost,
          port: dbPort,
          database: mainDbName,
          user: dbUser,
          password: dbPassword,
        });
        await adminPool.query('SELECT 1');
      } catch (err2) {
        // Se ainda falhar, tentar sem especificar banco (usa banco padrão do usuário)
        adminPool = new (await import('pg')).Pool({
          host: dbHost,
          port: dbPort,
          user: dbUser,
          password: dbPassword,
        });
        await adminPool.query('SELECT 1');
      }
    }
    
    // Tentar criar banco de teste se não existir
    try {
      await adminPool.query(`CREATE DATABASE ${testDbName}`);
      console.log(`✅ Test database ${testDbName} created`);
    } catch (err) {
      if (err.code !== '42P04') { // 42P04 = database already exists
        // Se não conseguir criar, apenas avisar (pode ser que o banco já exista ou não tenha permissão)
        console.warn(`⚠️  Could not create test database ${testDbName}: ${err.message}`);
        console.warn('   Tests will use existing database if available');
      }
    }

    await adminPool.end();

    // Executar migrations no banco de teste
    // Por enquanto, vamos apenas limpar as tabelas antes dos testes
    // As migrations devem ser executadas manualmente ou via script
  } catch (error) {
    console.error('Error setting up test database:', error);
    console.error('Make sure PostgreSQL is running and DB_USER/DB_PASSWORD are set correctly');
    // Não lançar erro para não bloquear todos os testes
    // Os testes individuais falharão se o banco não estiver disponível
  }
});

// Limpar dados após cada teste
afterEach(async () => {
  try {
    // Limpar todas as tabelas (em ordem reversa de dependências)
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
      try {
        await testPool.query(`TRUNCATE TABLE ${table} CASCADE`);
      } catch (error) {
        // Ignore errors if table doesn't exist
        if (error.code !== '42P01') {
          console.error(`Error truncating table ${table}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning test database:', error);
  }
});

// Fechar conexões após todos os testes
afterAll(async () => {
  await testPool.end();
});

