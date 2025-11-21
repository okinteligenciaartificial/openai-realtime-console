import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'postgres', // Conectar ao postgres para criar o banco
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('Creating database transition2english...');
    
    // Criar banco de dados se não existir
    await client.query('CREATE DATABASE transition2english');
    console.log('Database created successfully!');
  } catch (error) {
    if (error.code === '42P04') {
      console.log('Database already exists, continuing...');
    } else {
      throw error;
    }
  } finally {
    client.release();
  }

  // Conectar ao banco transition2english
  const dbPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'transition2english',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  const dbClient = await dbPool.connect();

  try {
    // Executar migration 002_initial_schema.sql
    console.log('Running migration 002_initial_schema.sql...');
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, '../db/migrations/002_initial_schema.sql'),
      'utf-8'
    );
    await dbClient.query(schemaSQL);
    console.log('Schema migration completed!');

    // Executar migration 003_seed_data.sql
    console.log('Running migration 003_seed_data.sql...');
    const seedSQL = fs.readFileSync(
      path.join(__dirname, '../db/migrations/003_seed_data.sql'),
      'utf-8'
    );
    await dbClient.query(seedSQL);
    console.log('Seed data migration completed!');

    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    dbClient.release();
    await dbPool.end();
  }

  await pool.end();
}

runMigrations().catch((error) => {
  console.error('Failed to run migrations:', error);
  process.exit(1);
});

