import express from 'express';
import 'dotenv/config';

// Validar variáveis de ambiente obrigatórias
const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingEnvVars.length > 0 && process.env.NODE_ENV !== 'test') {
  console.warn(`⚠️  Warning: Missing environment variables: ${missingEnvVars.join(', ')}`);
  console.warn('   Some features may not work correctly. Check .env.example for required variables.');
}

// Importar rotas
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import teachersRouter from './routes/teachers.js';
import plansRouter from './routes/plans.js';
import subscriptionsRouter from './routes/subscriptions.js';
import sessionsRouter from './routes/sessions.js';
import metricsRouter from './routes/metrics.js';
import realtimeRouter from './routes/realtime.js';
import limitsRouter from './routes/limits.js';
import conversationsRouter from './routes/conversations.js';

const app = express();

// Middlewares
app.use(express.text());
app.use(express.json());

// CORS - Permitir requisições do frontend
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Em desenvolvimento, aceitar qualquer origem localhost
  // Em produção, usar FRONTEND_URL ou aceitar qualquer origem se não definido
  if (process.env.NODE_ENV === 'development' || !process.env.FRONTEND_URL) {
    // Aceitar qualquer origem em desenvolvimento ou se FRONTEND_URL não estiver definido
    res.header('Access-Control-Allow-Origin', origin || '*');
  } else {
    // Em produção, usar FRONTEND_URL se definido
    res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Middleware de logging
const logRequest = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';
    const message = `${new Date().toISOString()} [${logLevel}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`;
    
    if (process.env.NODE_ENV === 'production') {
      // Em produção, usar console.log estruturado (pode ser redirecionado para logs)
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: logLevel.toLowerCase(),
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        ip: req.ip || req.connection.remoteAddress,
      }));
    } else {
      console.log(message);
    }
  });
  
  next();
};

app.use(logRequest);

// Registrar rotas da API
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/teachers', teachersRouter);
app.use('/api/plans', plansRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/realtime', realtimeRouter);
app.use('/api/limits', limitsRouter);
app.use('/api/conversations', conversationsRouter);

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Log do erro
  if (statusCode >= 500) {
    // Erros do servidor - log completo
    console.error('Server Error:', {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode,
      error: err.message,
      stack: isProduction ? undefined : err.stack,
    });
  } else {
    // Erros do cliente - log resumido
    console.warn('Client Error:', {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode,
      error: err.message,
    });
  }
  
  // Resposta ao cliente
  res.status(statusCode).json({
    error: err.message || 'Internal server error',
    ...(isProduction ? {} : { stack: err.stack }),
  });
});

// Rota de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'transition2english-backend',
    version: '1.0.0'
  });
});

// Rota de documentação básica da API
app.get('/api', (req, res) => {
  res.json({
    name: 'Transition2English API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      teachers: '/api/teachers',
      plans: '/api/plans',
      subscriptions: '/api/subscriptions',
      sessions: '/api/sessions',
      metrics: '/api/metrics'
    },
    documentation: 'See API_DOCUMENTATION.md for detailed API documentation'
  });
});

export default app;

