# Transition2English Backend API

Backend API for the Transition2English multi-tenant metrics system.

## Features

- User authentication and authorization (JWT)
- Multi-tenant user management
- Teacher and student management
- Subscription and plan management
- Session tracking and metrics
- Cost calculation and usage statistics
- Admin dashboard endpoints

## Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Update `.env` with your database credentials and JWT secret.

4. Run database migrations:
```bash
npm run migrate
```

## Running the Server

### Development
```bash
npm run dev
```

The server will start on `http://localhost:3001` (or the port specified in `BACKEND_PORT`).

### Production
```bash
# Validar variáveis de ambiente primeiro
npm run validate

# Iniciar servidor
npm start

# Ou usar PM2 (recomendado)
pm2 start ecosystem.config.js --env production
pm2 save
```

## Testing

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

## Production Deployment

For complete deployment instructions, see [DEPLOY.md](./DEPLOY.md).

### Quick Start for Production

1. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

2. **Validate configuration:**
   ```bash
   npm run validate
   ```

3. **Install production dependencies:**
   ```bash
   npm install --production
   ```

4. **Run database migrations**

5. **Start with PM2:**
   ```bash
   pm2 start ecosystem.config.js --env production
   pm2 save
   ```

## Project Structure

```
backend/
├── src/
│   ├── app.js              # Express app configuration
│   ├── config/
│   │   ├── database.js     # Database connection
│   │   └── test-database.js # Test database connection
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Express middleware
│   ├── routes/            # API routes
│   └── services/          # Business logic
├── tests/
│   ├── helpers/           # Test helpers
│   ├── routes/            # Route tests
│   ├── middleware/        # Middleware tests
│   ├── integration/       # Integration tests
│   └── setup.js           # Test setup
├── server.js              # Server entry point
├── package.json
├── vitest.config.js       # Test configuration
└── README.md
```

## API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API documentation.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BACKEND_PORT` | Server port | `3001` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `transition2english` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | - |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_EXPIRES_IN` | JWT expiration | `7d` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |
| `NODE_ENV` | Environment | `development` |

## Health Check

The server provides a health check endpoint:

```bash
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "transition2english-backend",
  "version": "1.0.0"
}
```

## API Base

All API endpoints are prefixed with `/api`:

- Authentication: `/api/auth`
- Users: `/api/users`
- Teachers: `/api/teachers`
- Plans: `/api/plans`
- Subscriptions: `/api/subscriptions`
- Sessions: `/api/sessions`
- Metrics: `/api/metrics`

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <token>
```

Get a token by logging in:
```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}
```

## Admin Endpoints

Admin endpoints require both authentication and admin role. Use an admin user token to access:

- `/api/users/admin/*`
- `/api/teachers/admin/*`
- `/api/plans/admin/*`
- `/api/subscriptions/admin/*`
- `/api/sessions/admin/*`
- `/api/metrics/admin/*`

## Database

The application uses PostgreSQL. Ensure the database is running and migrations have been executed before starting the server.

### Test Database

Tests use a separate test database (default: `{DB_NAME}_test`). Set `TEST_DATABASE_NAME` in `.env` to customize.

## Development

### Adding New Endpoints

1. Create controller in `src/controllers/`
2. Create route in `src/routes/`
3. Register route in `src/app.js`
4. Add tests in `tests/routes/`
5. Update API documentation

### Code Style

- Use ES6+ syntax
- Follow existing code patterns
- Add JSDoc comments for functions
- Write tests for new features

## License

ISC

