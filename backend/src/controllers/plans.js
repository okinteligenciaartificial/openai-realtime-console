import { query } from '../services/database.js';

/**
 * Listar planos
 */
export async function listPlans(req, res) {
  try {
    const result = await query(
      'SELECT * FROM user_plans WHERE is_active = true ORDER BY name'
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error listing plans:', error);
    res.status(500).json({ error: 'Failed to list plans' });
  }
}

// ============================================
// ADMIN CONTROLLERS
// ============================================

/**
 * Listar todos os planos (admin only)
 */
export async function adminListPlans(req, res) {
  try {
    const result = await query(
      'SELECT * FROM user_plans ORDER BY name'
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error listing plans:', error);
    res.status(500).json({ error: 'Failed to list plans' });
  }
}

/**
 * Obter plano (admin only)
 */
export async function adminGetPlan(req, res) {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM user_plans WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting plan:', error);
    res.status(500).json({ error: 'Failed to get plan' });
  }
}

/**
 * Criar plano (admin only)
 */
export async function adminCreatePlan(req, res) {
  try {
    const { name, monthly_token_limit, monthly_session_limit, cost_per_token } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const result = await query(
      `INSERT INTO user_plans (name, monthly_token_limit, monthly_session_limit, cost_per_token, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
      [name, monthly_token_limit || null, monthly_session_limit || null, cost_per_token || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({ error: 'Failed to create plan' });
  }
}

/**
 * Atualizar plano (admin only)
 */
export async function adminUpdatePlan(req, res) {
  try {
    const { id } = req.params;
    const { name, monthly_token_limit, monthly_session_limit, cost_per_token, is_active } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (monthly_token_limit !== undefined) {
      updates.push(`monthly_token_limit = $${paramCount++}`);
      values.push(monthly_token_limit);
    }
    if (monthly_session_limit !== undefined) {
      updates.push(`monthly_session_limit = $${paramCount++}`);
      values.push(monthly_session_limit);
    }
    if (cost_per_token !== undefined) {
      updates.push(`cost_per_token = $${paramCount++}`);
      values.push(cost_per_token);
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
      `UPDATE user_plans SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({ error: 'Failed to update plan' });
  }
}

/**
 * Deletar plano (admin only)
 */
export async function adminDeletePlan(req, res) {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM user_plans WHERE id = $1 RETURNING id, name',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json({ message: 'Plan deleted', plan: result.rows[0] });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({ error: 'Failed to delete plan' });
  }
}

