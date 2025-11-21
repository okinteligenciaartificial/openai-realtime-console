# API Documentation - Sistema de Métricas Multi-Tenant

## Configuração Inicial

### 1. Variáveis de Ambiente

Adicione ao arquivo `.env`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=transition2english
DB_USER=postgres
DB_PASSWORD=sua_senha

# OpenAI (já existe)
OPENAI_API_KEY=sua_chave
```

### 2. Criar Banco de Dados e Executar Migrations

```bash
npm run migrate
```

Este comando irá:
- Criar o banco de dados `transition2english`
- Executar todas as migrations
- Inserir dados iniciais (planos e preços)

## Autenticação

**Nota:** O sistema não possui autenticação inicial. O `user_id` deve ser enviado via:

- Header: `X-User-Id: <uuid>`
- Query parameter: `?user_id=<uuid>`
- Body (para POST): `{ "user_id": "<uuid>" }`

## Endpoints da API

### Usuários

#### POST /api/users
Criar novo usuário

```json
{
  "email": "aluno@example.com",
  "name": "João Silva",
  "role": "student"
}
```

#### GET /api/users/:id
Obter informações do usuário

#### PUT /api/users/:id
Atualizar usuário (requer userContext)

#### GET /api/users/:id/metrics
Obter métricas do usuário (requer userContext)

### Professores

#### POST /api/teachers
Criar professor

```json
{
  "user_id": "<uuid>",
  "teacher_code": "PROF001",
  "image_url": "/assets/teacher1.jpg"
}
```

#### GET /api/teachers
Listar todos os professores

#### GET /api/teachers/:id/students
Obter alunos de um professor

#### GET /api/teachers/:id/summary
Resumo de alunos por professor

### Planos

#### GET /api/plans
Listar todos os planos ativos

#### POST /api/plans
Criar novo plano (admin only)

```json
{
  "name": "Premium",
  "monthly_token_limit": null,
  "monthly_session_limit": null,
  "cost_per_token": 0.0000008
}
```

#### PUT /api/plans/:id
Atualizar plano (admin only)

### Assinaturas

#### POST /api/subscriptions
Criar assinatura para um usuário

```json
{
  "user_id": "<uuid>",
  "plan_id": "<uuid>",
  "teacher_id": "<uuid>" // opcional
}
```

#### GET /api/subscriptions/user/:userId
Obter assinatura ativa do usuário (requer userContext)

#### PUT /api/subscriptions/:id
Atualizar assinatura (requer userContext)

### Sessões

#### POST /api/sessions
Criar nova sessão (requer userContext)

```json
{
  "session_id": "<uuid>",
  "model": "gpt-4o-mini-realtime-preview"
}
```

**Headers:**
```
X-User-Id: <uuid>
```

#### POST /api/sessions/:sessionId/metrics
Atualizar métricas da sessão (requer userContext)

```json
{
  "input_tokens": 150,
  "output_tokens": 200
}
```

#### POST /api/sessions/:sessionId/finalize
Finalizar sessão (requer userContext)

#### GET /api/sessions/:sessionId
Obter detalhes da sessão (requer userContext)

#### GET /api/sessions/user/:userId
Listar sessões do usuário (requer userContext)

Query params:
- `limit` (default: 50)
- `offset` (default: 0)

#### POST /api/sessions/:sessionId/events
Registrar evento de uso (requer userContext)

```json
{
  "event_type": "response.done",
  "input_tokens": 150,
  "output_tokens": 200,
  "event_data": {}
}
```

### Métricas

#### GET /api/metrics/summary/:userId
Resumo de métricas do usuário (requer userContext)

Query params:
- `start_date` (opcional)
- `end_date` (opcional)

#### GET /api/metrics/sessions/:userId
Histórico de sessões (requer userContext)

Query params:
- `limit` (default: 50)
- `offset` (default: 0)
- `start_date` (opcional)
- `end_date` (opcional)

#### GET /api/metrics/export/:userId
Exportar dados (JSON/CSV) (requer userContext)

Query params:
- `format` (json ou csv, default: json)
- `start_date` (opcional)
- `end_date` (opcional)

## Estrutura do Banco de Dados

### Tabelas Principais

1. **users** - Usuários (alunos e professores)
2. **teachers** - Professores (com image_url e additional_attributes)
3. **user_plans** - Planos de uso
4. **user_subscriptions** - Assinaturas de alunos
5. **sessions** - Sessões de conversa
6. **session_metrics** - Métricas agregadas por sessão
7. **usage_events** - Eventos detalhados (histórico)
8. **pricing_config** - Configuração de preços OpenAI
9. **usage_limits_tracking** - Rastreamento de limites mensais

Todas as tabelas possuem o campo `additional_attributes` (JSONB) para expansão futura.

## Fluxo de Uso

1. **Criar usuário**: `POST /api/users`
2. **Criar assinatura**: `POST /api/subscriptions` (vinculando a um plano)
3. **Iniciar sessão**: `POST /api/sessions` (com header X-User-Id)
4. **Durante sessão**: `POST /api/sessions/:id/metrics` (enviar tokens periodicamente)
5. **Finalizar sessão**: `POST /api/sessions/:id/finalize`
6. **Consultar métricas**: `GET /api/metrics/summary/:userId`

## Limites e Validações

- O sistema verifica limites de tokens e sessões antes de criar/atualizar
- Limites são baseados no plano ativo do usuário
- NULL em monthly_token_limit ou monthly_session_limit = ilimitado
- Rastreamento mensal automático via usage_limits_tracking

## Exemplo de Integração no Cliente

O arquivo `client/components/App.jsx` já está integrado e:
- Cria sessão automaticamente ao iniciar
- Envia métricas quando recebe eventos com tokens
- Finaliza sessão ao parar

O `user_id` é obtido do localStorage ou pode ser configurado.

