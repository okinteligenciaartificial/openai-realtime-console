import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

// Pool de conexão separado para testes
// Usa banco de teste separado ou mesmo banco com prefixo test_
// Usar o mesmo usuário do banco principal, ou o usuário do sistema
const dbUser = process.env.DB_USER || process.env.USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || '';

const testPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.TEST_DATABASE_NAME || `${process.env.DB_NAME || 'transition2english'}_test`,
  user: dbUser,
  password: dbPassword,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

testPool.on('error', (err) => {
  console.error('Unexpected error on test database client', err);
});

export default testPool;

