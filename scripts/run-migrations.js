import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

// Determinar qual banco usar baseado no ambiente
const isTest = process.env.NODE_ENV === 'test';
const dbName = isTest 
  ? (process.env.TEST_DATABASE_NAME || `${process.env.DB_NAME || 'transition2english'}_test`)
  : (process.env.DB_NAME || 'transition2english');

// Usar o mesmo usuário do banco principal, ou o usuário do sistema
const dbUser = process.env.DB_USER || process.env.USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || '';

console.log(`🔧 Running migrations for database: ${dbName}`);
console.log(`   User: ${dbUser}`);
console.log(`   Environment: ${isTest ? 'TEST' : 'PRODUCTION/DEVELOPMENT'}`);

// Pool para conectar ao banco padrão (para criar o banco se necessário)
const adminPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'postgres', // Tentar conectar ao postgres primeiro
  user: dbUser,
  password: dbPassword,
});

async function runMigrations() {
  let adminClient;
  
  try {
    // Tentar conectar ao banco padrão para criar o banco se necessário
    adminClient = await adminPool.connect();
    console.log('✅ Connected to PostgreSQL');
  } catch (error) {
    // Se não conseguir conectar ao 'postgres', tentar sem especificar banco
    await adminPool.end();
    adminPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: dbUser,
      password: dbPassword,
    });
    adminClient = await adminPool.connect();
    console.log('✅ Connected to PostgreSQL (default database)');
  }
  
  try {
    // Criar banco de dados se não existir (apenas se não for teste ou se o banco não existir)
    if (!isTest) {
      try {
        await adminClient.query(`CREATE DATABASE ${dbName}`);
        console.log(`✅ Database ${dbName} created successfully!`);
      } catch (error) {
        if (error.code === '42P04') {
          console.log(`ℹ️  Database ${dbName} already exists, continuing...`);
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    // Se não conseguir criar, apenas avisar (pode ser que o banco já exista)
    if (error.code !== '42P04') {
      console.warn(`⚠️  Could not create database ${dbName}: ${error.message}`);
      console.warn('   Continuing anyway (database may already exist)...');
    }
  } finally {
    adminClient.release();
    await adminPool.end();
  }

  // Conectar ao banco de destino
  const dbPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: dbName,
    user: dbUser,
    password: dbPassword,
  });

  const dbClient = await dbPool.connect();

  try {
    // Executar migration 002_initial_schema.sql
    console.log('📄 Running migration 002_initial_schema.sql...');
    const schemaPath = path.join(__dirname, '../backend/db/migrations/002_initial_schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Migration file not found: ${schemaPath}`);
    }
    
    const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');
    await dbClient.query(schemaSQL);
    console.log('✅ Schema migration completed!');

    // Executar migration 003_seed_data.sql (apenas se não for teste)
    if (!isTest) {
      console.log('📄 Running migration 003_seed_data.sql...');
      const seedPath = path.join(__dirname, '../backend/db/migrations/003_seed_data.sql');
      
      if (fs.existsSync(seedPath)) {
        const seedSQL = fs.readFileSync(seedPath, 'utf-8');
        await dbClient.query(seedSQL);
        console.log('✅ Seed data migration completed!');
      } else {
        console.log('ℹ️  Seed data file not found, skipping...');
      }
    } else {
      console.log('ℹ️  Skipping seed data for test database');
    }

    // Executar migration 004_create_conversation_messages.sql
    console.log('📄 Running migration 004_create_conversation_messages.sql...');
    const conversationMessagesPath = path.join(__dirname, '../backend/db/migrations/004_create_conversation_messages.sql');
    
    if (fs.existsSync(conversationMessagesPath)) {
      const conversationMessagesSQL = fs.readFileSync(conversationMessagesPath, 'utf-8');
      await dbClient.query(conversationMessagesSQL);
      console.log('✅ Conversation messages migration completed!');
    } else {
      console.log('ℹ️  Conversation messages migration file not found, skipping...');
    }

    // Executar migration 005_add_cost_to_conversation_messages.sql
    console.log('📄 Running migration 005_add_cost_to_conversation_messages.sql...');
    const addCostPath = path.join(__dirname, '../backend/db/migrations/005_add_cost_to_conversation_messages.sql');
    
    if (fs.existsSync(addCostPath)) {
      const addCostSQL = fs.readFileSync(addCostPath, 'utf-8');
      await dbClient.query(addCostSQL);
      console.log('✅ Add cost to conversation messages migration completed!');
    } else {
      console.log('ℹ️  Add cost migration file not found, skipping...');
    }

    console.log('✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    if (error.code === '42P01') {
      console.error('   This might be a table that already exists. Check if migrations were already run.');
    }
    throw error;
  } finally {
    dbClient.release();
    await dbPool.end();
  }
}

runMigrations().catch((error) => {
  console.error('❌ Failed to run migrations:', error);
  process.exit(1);
});
