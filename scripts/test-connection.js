import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

async function testConnection() {
  console.log('Testing PostgreSQL connection...');
  console.log('Config:', {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD ? '***' : '(empty)',
  });

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT version()');
    console.log('✅ Connection successful!');
    console.log('PostgreSQL version:', result.rows[0].version);
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('\nPossible solutions:');
    console.error('1. Make sure PostgreSQL is running: brew services start postgresql@17');
    console.error('2. Check if the port is correct (default: 5432)');
    console.error('3. Verify DB_USER and DB_PASSWORD in .env file');
    console.error('4. Check PostgreSQL connection string if using MCP okia_app');
    await pool.end();
    return false;
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});

