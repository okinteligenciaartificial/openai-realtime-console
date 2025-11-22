# Teste de Integração - Frontend + Backend

## Status dos Servidores

✅ **Backend**: Rodando na porta 3001
- Health Check: http://localhost:3001/health
- API Base: http://localhost:3001/api

✅ **Frontend**: Rodando na porta 5173
- URL: http://localhost:5173

## Testes Realizados

### 1. Registro de Usuário
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@example.com","name":"Usuário Teste","password":"senha123","role":"student"}'
```

### 2. Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@example.com","password":"senha123"}'
```

### 3. Verificar Autenticação
```bash
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer <token>"
```

### 4. Listar Planos (Público)
```bash
curl http://localhost:3001/api/plans
```

### 5. Listar Professores (Público)
```bash
curl http://localhost:3001/api/teachers
```

## Como Testar no Navegador

1. Acesse: http://localhost:5173
2. Faça login ou registre-se
3. Navegue pelo dashboard
4. Teste as funcionalidades disponíveis

## Credenciais de Teste

- **Email**: teste@example.com
- **Senha**: senha123
- **Role**: student

## Endpoints Disponíveis

### Autenticação
- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/login` - Fazer login
- `GET /api/auth/me` - Obter usuário autenticado (requer token)

### Planos
- `GET /api/plans` - Listar planos ativos

### Professores
- `GET /api/teachers` - Listar professores ativos

### Métricas (requer autenticação)
- `GET /api/metrics/summary/:userId` - Resumo de métricas do usuário

### Sessões (requer autenticação)
- `POST /api/sessions` - Criar sessão
- `GET /api/sessions/user/:userId` - Listar sessões do usuário

## Próximos Passos

1. Testar todas as funcionalidades no navegador
2. Verificar se há erros no console
3. Testar fluxos completos (registro → login → dashboard)
4. Verificar responsividade em diferentes dispositivos

