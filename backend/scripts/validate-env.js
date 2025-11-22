#!/usr/bin/env node
/**
 * Script para validar variáveis de ambiente antes de iniciar o servidor
 */
import 'dotenv/config';

const requiredEnvVars = {
  production: [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET',
  ],
  development: [
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'JWT_SECRET',
  ],
  test: [
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
  ],
};

const env = process.env.NODE_ENV || 'development';
const required = requiredEnvVars[env] || requiredEnvVars.development;

console.log(`🔍 Validating environment variables for: ${env}`);
console.log('');

const missing = [];
const warnings = [];

// Verificar variáveis obrigatórias
for (const varName of required) {
  if (!process.env[varName]) {
    missing.push(varName);
  }
}

// Verificações adicionais
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  warnings.push('JWT_SECRET deve ter pelo menos 32 caracteres para produção');
}

if (env === 'production') {
  if (process.env.JWT_SECRET === 'your-secret-key-change-in-production-min-32-chars') {
    warnings.push('JWT_SECRET não foi alterado do valor padrão');
  }
  
  if (process.env.FRONTEND_URL === 'http://localhost:3000') {
    warnings.push('FRONTEND_URL ainda está configurado para localhost');
  }
  
  if (!process.env.DB_PASSWORD || process.env.DB_PASSWORD === 'your-database-password') {
    warnings.push('DB_PASSWORD não foi configurado corretamente');
  }
}

// Exibir resultados
if (missing.length > 0) {
  console.error('❌ Variáveis de ambiente obrigatórias não encontradas:');
  missing.forEach((varName) => console.error(`   - ${varName}`));
  console.error('');
  console.error('Configure as variáveis no arquivo .env antes de continuar.');
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn('⚠️  Avisos:');
  warnings.forEach((warning) => console.warn(`   - ${warning}`));
  console.warn('');
}

if (missing.length === 0 && warnings.length === 0) {
  console.log('✅ Todas as variáveis de ambiente estão configuradas corretamente!');
  process.exit(0);
} else if (missing.length === 0) {
  console.log('✅ Variáveis obrigatórias configuradas (mas há avisos acima)');
  process.exit(0);
}

