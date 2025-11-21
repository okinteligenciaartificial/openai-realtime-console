import express from 'express';
import { query } from '../services/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Criar assinatura
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { user_id, plan_id, teacher_id } = req.body;
    const userId = user_id || req.userId;

    // Verificar se o usuário está criando para si mesmo ou é admin
    if (userId !== req.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!plan_id) {
      return res.status(400).json({ error: 'plan_id is required' });
    }

    // Desativar assinaturas anteriores do usuário
    await query(
      'UPDATE user_subscriptions SET is_active = false, end_date = CURRENT_TIMESTAMP WHERE user_id = $1 AND is_active = true',
      [userId]
    );

    // Criar nova assinatura
    const result = await query(
      `INSERT INTO user_subscriptions (user_id, plan_id, teacher_id, start_date, is_active)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, true)
       RETURNING *`,
      [userId, plan_id, teacher_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Obter assinatura atual do usuário
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verificar se o usuário está consultando sua própria assinatura ou é admin
    if (userId !== req.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await query(
      `SELECT us.*, up.name as plan_name, up.monthly_token_limit, up.monthly_session_limit
       FROM user_subscriptions us
       JOIN user_plans up ON us.plan_id = up.id
       WHERE us.user_id = $1 AND us.is_active = true
       ORDER BY us.start_date DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting subscription:', error);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

// Atualizar assinatura
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { plan_id, teacher_id, is_active, end_date } = req.body;

    // Verificar se a assinatura pertence ao usuário ou é admin
    const subscriptionResult = await query(
      'SELECT user_id FROM user_subscriptions WHERE id = $1',
      [id]
    );

    if (subscriptionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (subscriptionResult.rows[0].user_id !== req.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (plan_id !== undefined) {
      updates.push(`plan_id = $${paramCount++}`);
      values.push(plan_id);
    }
    if (teacher_id !== undefined) {
      updates.push(`teacher_id = $${paramCount++}`);
      values.push(teacher_id);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }
    if (end_date !== undefined) {
      updates.push(`end_date = $${paramCount++}`);
      values.push(end_date);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const result = await query(
      `UPDATE user_subscriptions SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

export default router;

