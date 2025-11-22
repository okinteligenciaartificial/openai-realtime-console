import 'dotenv/config';
import app from './src/app.js';

const PORT = process.env.BACKEND_PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Validar variáveis de ambiente obrigatórias apenas em produção
if (NODE_ENV === 'production') {
  const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Variáveis de ambiente obrigatórias não encontradas:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nExecute: npm run validate');
    process.exit(1);
  }

  // Validações adicionais para produção
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET deve ter pelo menos 32 caracteres em produção');
    process.exit(1);
  }

  if (process.env.JWT_SECRET === 'your-secret-key-change-in-production-min-32-chars') {
    console.error('❌ JWT_SECRET não foi alterado do valor padrão');
    process.exit(1);
  }
}

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📡 Environment: ${NODE_ENV}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API base: http://localhost:${PORT}/api`);
  
  if (NODE_ENV === 'production') {
    console.log('🔒 Production mode enabled');
  }
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    
    // Fechar conexões do banco de dados
    import('./src/services/database.js').then(({ default: pool }) => {
      pool.end(() => {
        console.log('✅ Database connections closed');
        process.exit(0);
      });
    }).catch(() => {
      process.exit(0);
    });
  });

  // Forçar encerramento após 10 segundos
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Tratamento de erros não capturados
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
