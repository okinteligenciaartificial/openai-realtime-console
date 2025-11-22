# API Documentation - Transition2English Backend

## Base URL
```
http://localhost:3001/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

Tokens are obtained through the `/api/auth/login` or `/api/auth/register` endpoints.

## Endpoints

### Authentication (`/api/auth`)

#### POST `/api/auth/register`
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "User Name",
  "password": "password123",
  "role": "student" // optional: "student", "teacher", "admin"
}
```

**Response:** `201 Created`
```json
{
  "message": "Usuário criado com sucesso",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "student"
  }
}
```

#### POST `/api/auth/login`
Login and get JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "student"
  }
}
```

#### GET `/api/auth/me`
Get current authenticated user information.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "User Name",
  "role": "student",
  "is_active": true,
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

#### PUT `/api/auth/password`
Update user password.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "currentPassword": "old-password",
  "newPassword": "new-password"
}
```

**Response:** `200 OK`
```json
{
  "message": "Senha atualizada com sucesso"
}
```

### Users (`/api/users`)

#### GET `/api/users/:id`
Get user by ID.

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "User Name",
  "role": "student",
  "is_active": true,
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

#### GET `/api/users/admin/users`
List all users (Admin only).

**Headers:** `Authorization: Bearer <admin-token>`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `role` (optional): Filter by role
- `is_active` (optional): Filter by active status
- `search` (optional): Search by name or email

**Response:** `200 OK`
```json
{
  "users": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

#### POST `/api/users/admin/users`
Create user (Admin only).

**Headers:** `Authorization: Bearer <admin-token>`

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "User Name",
  "role": "student",
  "password": "password123"
}
```

**Response:** `201 Created`

#### PUT `/api/users/admin/users/:id`
Update user (Admin only).

**Headers:** `Authorization: Bearer <admin-token>`

**Request Body:**
```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "role": "teacher",
  "is_active": true,
  "password": "new-password"
}
```

**Response:** `200 OK`

#### DELETE `/api/users/admin/users/:id`
Deactivate user (Admin only - soft delete).

**Headers:** `Authorization: Bearer <admin-token>`

**Response:** `200 OK`
```json
{
  "message": "User deactivated",
  "user": {...}
}
```

### Teachers (`/api/teachers`)

#### GET `/api/teachers`
List all active teachers.

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "teacher_code": "TEACHER001",
    "image_url": "/assets/teacher.jpg",
    "email": "teacher@example.com",
    "name": "Teacher Name"
  }
]
```

#### POST `/api/teachers`
Create teacher.

**Request Body:**
```json
{
  "user_id": "uuid",
  "teacher_code": "TEACHER001",
  "image_url": "/assets/teacher.jpg"
}
```

**Response:** `201 Created`

#### GET `/api/teachers/:id/students`
Get students assigned to a teacher.

**Response:** `200 OK`
```json
[
  {
    "user_id": "uuid",
    "email": "student@example.com",
    "name": "Student Name",
    "plan_name": "Basic Plan",
    "start_date": "2024-01-01T00:00:00.000Z"
  }
]
```

#### GET `/api/teachers/:id/summary`
Get teacher summary statistics.

**Response:** `200 OK`

#### PUT `/api/teachers/admin/teachers/:id`
Update teacher (Admin only).

**Headers:** `Authorization: Bearer <admin-token>`

**Request Body:**
```json
{
  "teacher_code": "UPDATED001",
  "image_url": "/assets/updated.jpg"
}
```

**Response:** `200 OK`

#### DELETE `/api/teachers/admin/teachers/:id`
Delete teacher (Admin only).

**Headers:** `Authorization: Bearer <admin-token>`

**Response:** `200 OK`

### Plans (`/api/plans`)

#### GET `/api/plans`
List all active plans.

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Basic Plan",
    "monthly_token_limit": 100000,
    "monthly_session_limit": 10,
    "cost_per_token": 0.00000075,
    "is_active": true
  }
]
```

#### GET `/api/plans/admin/plans`
List all plans including inactive (Admin only).

**Headers:** `Authorization: Bearer <admin-token>`

**Response:** `200 OK`

#### POST `/api/plans/admin/plans`
Create plan (Admin only).

**Headers:** `Authorization: Bearer <admin-token>`

**Request Body:**
```json
{
  "name": "Premium Plan",
  "monthly_token_limit": 500000,
  "monthly_session_limit": 50,
  "cost_per_token": 0.00000075
}
```

**Response:** `201 Created`

#### PUT `/api/plans/admin/plans/:id`
Update plan (Admin only).

**Headers:** `Authorization: Bearer <admin-token>`

**Response:** `200 OK`

#### DELETE `/api/plans/admin/plans/:id`
Delete plan (Admin only).

**Headers:** `Authorization: Bearer <admin-token>`

**Response:** `200 OK`

### Subscriptions (`/api/subscriptions`)

#### POST `/api/subscriptions`
Create subscription.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "plan_id": "uuid",
  "teacher_id": "uuid"
}
```

**Response:** `201 Created`

#### GET `/api/subscriptions/user/:userId`
Get user's active subscription.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "plan_id": "uuid",
  "teacher_id": "uuid",
  "plan_name": "Basic Plan",
  "monthly_token_limit": 100000,
  "is_active": true,
  "start_date": "2024-01-01T00:00:00.000Z"
}
```

#### PUT `/api/subscriptions/:id`
Update subscription.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "plan_id": "uuid",
  "teacher_id": "uuid",
  "is_active": false
}
```

**Response:** `200 OK`

#### GET `/api/subscriptions/admin/subscriptions`
List all subscriptions (Admin only).

**Headers:** `Authorization: Bearer <admin-token>`

**Response:** `200 OK`

#### POST `/api/subscriptions/admin/subscriptions`
Create subscription (Admin only).

**Headers:** `Authorization: Bearer <admin-token>`

**Request Body:**
```json
{
  "user_id": "uuid",
  "plan_id": "uuid",
  "teacher_id": "uuid"
}
```

**Response:** `201 Created`

### Sessions (`/api/sessions`)

#### POST `/api/sessions`
Create session.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "session_id": "session-123",
  "model": "gpt-4o-mini-realtime-preview"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "session_id": "session-123",
  "model": "gpt-4o-mini-realtime-preview",
  "status": "active",
  "start_time": "2024-01-01T00:00:00.000Z"
}
```

#### GET `/api/sessions/user/:userId`
Get user sessions.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Offset for pagination (default: 0)
- `start_date` (optional): Filter by start date
- `end_date` (optional): Filter by end date

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "session_id": "session-123",
    "status": "completed",
    "start_time": "2024-01-01T00:00:00.000Z",
    "duration_seconds": 300
  }
]
```

#### POST `/api/sessions/:sessionId/metrics`
Update session metrics.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "input_tokens": 1000,
  "output_tokens": 500
}
```

**Response:** `200 OK`
```json
{
  "success": true
}
```

#### POST `/api/sessions/:sessionId/finalize`
Finalize session.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "duration_seconds": 300
}
```

**Response:** `200 OK`

#### GET `/api/sessions/admin/sessions`
List all sessions (Admin only).

**Headers:** `Authorization: Bearer <admin-token>`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `user_id` (optional): Filter by user
- `status` (optional): Filter by status
- `start_date` (optional): Filter by start date
- `end_date` (optional): Filter by end date

**Response:** `200 OK`

#### GET `/api/sessions/admin/sessions/stats`
Get session statistics (Admin only).

**Headers:** `Authorization: Bearer <admin-token>`

**Query Parameters:**
- `start_date` (optional): Filter by start date
- `end_date` (optional): Filter by end date

**Response:** `200 OK`
```json
{
  "total_sessions": 100,
  "active_sessions": 5,
  "completed_sessions": 95,
  "total_tokens": 1000000,
  "total_cost": 0.75,
  "total_duration": 30000
}
```

### Metrics (`/api/metrics`)

#### GET `/api/metrics/summary/:userId`
Get user metrics summary.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `start_date` (optional): Filter by start date
- `end_date` (optional): Filter by end date

**Response:** `200 OK`
```json
{
  "user_id": "uuid",
  "total_sessions": 10,
  "total_duration_seconds": 3000,
  "total_input_tokens": 50000,
  "total_output_tokens": 25000,
  "total_tokens": 75000,
  "total_cost": 0.05625
}
```

#### GET `/api/metrics/sessions/:userId`
Get user session metrics.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

#### GET `/api/metrics/export/:userId`
Export user data (JSON).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `format` (optional): Export format (default: "json")
- `start_date` (optional): Filter by start date
- `end_date` (optional): Filter by end date

**Response:** `200 OK`

#### GET `/api/metrics/admin/stats/overview`
Get overview statistics (Admin only).

**Headers:** `Authorization: Bearer <admin-token>`

**Response:** `200 OK`
```json
{
  "total_users": 100,
  "active_users": 80,
  "total_sessions": 1000,
  "total_cost": 750.00
}
```

#### GET `/api/metrics/admin/stats/users`
Get user statistics (Admin only).

**Headers:** `Authorization: Bearer <admin-token>`

**Response:** `200 OK`

#### GET `/api/metrics/admin/stats/costs`
Get cost statistics (Admin only).

**Headers:** `Authorization: Bearer <admin-token>`

**Response:** `200 OK`

#### GET `/api/metrics/admin/stats/usage`
Get usage statistics (Admin only).

**Headers:** `Authorization: Bearer <admin-token>`

**Query Parameters:**
- `start_date` (optional): Filter by start date
- `end_date` (optional): Filter by end date

**Response:** `200 OK`

### Limits (`/api/limits`)

#### GET `/api/limits/tokens`
Check token limit for authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `additionalTokens` (optional): Number of additional tokens to check

**Response:** `200 OK`
```json
{
  "allowed": true,
  "current": 5000,
  "limit": 10000,
  "warning": null
}
```

**Response (limit exceeded):** `200 OK`
```json
{
  "allowed": false,
  "reason": "Token limit exceeded",
  "current": 10000,
  "limit": 10000,
  "requested": 1000
}
```

#### GET `/api/limits/sessions`
Check session limit for authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "allowed": true,
  "current": 5,
  "limit": 10
}
```

**Response (limit exceeded):** `200 OK`
```json
{
  "allowed": false,
  "reason": "Session limit exceeded",
  "current": 10,
  "limit": 10
}
```

#### GET `/api/limits/usage`
Get current month usage for authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "user_id": "uuid",
  "year_month": "2024-01",
  "tokens_used": 5000,
  "sessions_count": 5
}
```

### Realtime (`/api/realtime`)

#### GET `/api/realtime/token`
Get OpenAI Realtime API token for authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "client_secret_value": "token-value"
}
```

#### POST `/api/realtime/session`
Create a new Realtime session with OpenAI.

**Headers:** 
- `Authorization: Bearer <token>`
- `Content-Type: text/plain`

**Request Body:** SDP offer as plain text

**Response:** `200 OK` - SDP answer as plain text

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Error message"
}
```

### 401 Unauthorized
```json
{
  "error": "Token não fornecido"
}
```

### 403 Forbidden
```json
{
  "error": "Acesso negado. Permissão insuficiente."
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 409 Conflict
```json
{
  "error": "Resource already exists"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., duplicate email)
- `500 Internal Server Error`: Server error

