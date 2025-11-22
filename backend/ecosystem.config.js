/**
 * Configuração PM2 para produção
 * 
 * Uso:
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup
 */
module.exports = {
  apps: [{
    name: 'transition2english-backend',
    script: './server.js',
    instances: 'max', // Usar todos os CPUs disponíveis
    exec_mode: 'cluster', // Modo cluster para melhor performance
    env: {
      NODE_ENV: 'development',
      BACKEND_PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      BACKEND_PORT: 3001
    },
    // Logs
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    // Auto-restart
    autorestart: true,
    watch: false, // Não assistir arquivos em produção
    max_memory_restart: '1G', // Reiniciar se usar mais de 1GB
    // Performance
    min_uptime: '10s', // Considerar estável após 10s
    max_restarts: 10, // Máximo de 10 reinicializações
    restart_delay: 4000, // Esperar 4s entre reinicializações
    // Advanced
    kill_timeout: 5000, // Tempo para graceful shutdown
    listen_timeout: 10000, // Tempo para app ficar pronto
  }]
};

