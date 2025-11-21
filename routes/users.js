import express from 'express';
import { query } from '../services/database.js';
import { getUserMetrics } from '../services/metrics.js';
import { authenticateToken, requireRole, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Criar usuário
router.post('/', async (req, res) => {
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
});

// Obter usuário
router.get('/:id', async (req, res) => {
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
});

// Atualizar usuário
router.put('/:id', authenticateToken, async (req, res) => {
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
});

// Obter métricas do usuário
router.get('/:id/metrics', authenticateToken, async (req, res) => {
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
});

export default router;

