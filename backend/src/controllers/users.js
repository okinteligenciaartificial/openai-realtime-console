import { query } from '../services/database.js';
import { getUserMetrics } from '../services/metrics.js';
import { hashPassword } from '../services/auth.js';

/**
 * Criar usuário
 */
export async function createUser(req, res) {
  try {
    const { email, name, role = 'student' } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'email and name are required' });
    }

    const result = await query(
      `INSERT INTO users (email, name, role, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING id, email, name, role, is_active, created_at`,
      [email, name, role]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
}

/**
 * Obter usuário
 */
export async function getUser(req, res) {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT id, email, name, role, is_active, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
}

/**
 * Atualizar usuário
 */
export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { name, email, is_active } = req.body;

    // Verificar se o usuário está atualizando a si mesmo ou é admin
    if (req.userId !== id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const result = await query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING id, email, name, role, is_active, created_at, updated_at`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
}

/**
 * Obter métricas do usuário
 */
export async function getUserMetricsController(req, res) {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    // Verificar se o usuário está consultando suas próprias métricas ou é admin
    if (req.userId !== id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const metrics = await getUserMetrics(id, start_date, end_date);
    res.json(metrics || {
      user_id: id,
      total_sessions: 0,
      total_duration_seconds: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_tokens: 0,
      total_cost: 0,
    });
  } catch (error) {
    console.error('Error getting user metrics:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
}

// ============================================
// ADMIN CONTROLLERS
// ============================================

/**
 * Listar todos os usuários (admin only)
 */
export async function listUsers(req, res) {
  try {
    const { page = 1, limit = 50, role, is_active, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let queryText = 'SELECT id, email, name, role, is_active, created_at, updated_at FROM users WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (role) {
      queryText += ` AND role = $${paramCount++}`;
      params.push(role);
    }

    if (is_active !== undefined) {
      queryText += ` AND is_active = $${paramCount++}`;
      params.push(is_active === 'true');
    }

    if (search) {
      queryText += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    queryText += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(parseInt(limit), offset);

    const result = await query(queryText, params);

    // Contar total
    let countQuery = 'SELECT COUNT(*) FROM users WHERE 1=1';
    const countParams = [];
    paramCount = 1;

    if (role) {
      countQuery += ` AND role = $${paramCount++}`;
      countParams.push(role);
    }

    if (is_active !== undefined) {
      countQuery += ` AND is_active = $${paramCount++}`;
      countParams.push(is_active === 'true');
    }

    if (search) {
      countQuery += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      countParams.push(`%${search}%`);
      paramCount++;
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
}

/**
 * Obter detalhes completos do usuário (admin only)
 */
export async function getUserDetails(req, res) {
  try {
    const { id } = req.params;

    // Buscar usuário
    const userResult = await query(
      'SELECT id, email, name, role, is_active, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Buscar assinatura ativa
    const subscriptionResult = await query(
      `SELECT us.*, up.name as plan_name, up.monthly_token_limit, up.monthly_session_limit
       FROM user_subscriptions us
       JOIN user_plans up ON us.plan_id = up.id
       WHERE us.user_id = $1 AND us.is_active = true
       ORDER BY us.start_date DESC
       LIMIT 1`,
      [id]
    );

    // Buscar métricas
    const metrics = await getUserMetrics(id);

    res.json({
      ...user,
      subscription: subscriptionResult.rows[0] || null,
      metrics: metrics || {
        total_sessions: 0,
        total_duration_seconds: 0,
        total_tokens: 0,
        total_cost: 0,
      },
    });
  } catch (error) {
    console.error('Error getting user details:', error);
    res.status(500).json({ error: 'Failed to get user details' });
  }
}

/**
 * Criar usuário (admin only - pode criar qualquer role)
 */
export async function adminCreateUser(req, res) {
  try {
    const { email, name, role = 'student', password } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'email and name are required' });
    }

    let passwordHash = null;
    if (password) {
      passwordHash = await hashPassword(password);
    }

    const result = await query(
      `INSERT INTO users (email, name, role, password_hash, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, email, name, role, is_active, created_at`,
      [email, name, role, passwordHash]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
}

/**
 * Atualizar usuário (admin only - pode atualizar qualquer campo incluindo role)
 */
export async function adminUpdateUser(req, res) {
  try {
    const { id } = req.params;
    const { name, email, role, is_active, password } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (role !== undefined) {
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }
    if (password !== undefined) {
      const passwordHash = await hashPassword(password);
      updates.push(`password_hash = $${paramCount++}`);
      values.push(passwordHash);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const result = await query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING id, email, name, role, is_active, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
}

/**
 * Desativar usuário (admin only - soft delete)
 */
export async function adminDeleteUser(req, res) {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, email, name, role, is_active`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deactivated', user: result.rows[0] });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
}

