import { query } from '../services/database.js';

/**
 * Criar professor
 */
export async function createTeacher(req, res) {
  try {
    const { user_id, teacher_code, image_url } = req.body;

    if (!user_id || !teacher_code) {
      return res.status(400).json({ error: 'user_id and teacher_code are required' });
    }

    // Verificar se o usuário existe e é do tipo teacher
    const userResult = await query(
      'SELECT id, role FROM users WHERE id = $1',
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userResult.rows[0].role !== 'teacher') {
      return res.status(400).json({ error: 'User must have role "teacher"' });
    }

    const result = await query(
      `INSERT INTO teachers (user_id, teacher_code, image_url)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, teacher_code, image_url, created_at`,
      [user_id, teacher_code, image_url || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Teacher code already exists' });
    }
    console.error('Error creating teacher:', error);
    res.status(500).json({ error: 'Failed to create teacher' });
  }
}

/**
 * Listar professores
 */
export async function listTeachers(req, res) {
  try {
    const result = await query(
      `SELECT t.*, u.email, u.name, u.role
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       WHERE u.is_active = true
       ORDER BY t.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error listing teachers:', error);
    res.status(500).json({ error: 'Failed to list teachers' });
  }
}

/**
 * Obter alunos de um professor
 */
export async function getTeacherStudents(req, res) {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT 
         us.user_id,
         u.email,
         u.name,
         us.start_date,
         us.end_date,
         us.is_active,
         up.name as plan_name
       FROM user_subscriptions us
       JOIN users u ON us.user_id = u.id
       JOIN user_plans up ON us.plan_id = up.id
       WHERE us.teacher_id = $1
       ORDER BY us.start_date DESC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error getting teacher students:', error);
    res.status(500).json({ error: 'Failed to get students' });
  }
}

/**
 * Obter resumo de alunos por professor
 */
export async function getTeacherSummary(req, res) {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT * FROM teacher_students_summary WHERE teacher_id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting teacher summary:', error);
    res.status(500).json({ error: 'Failed to get summary' });
  }
}

// ============================================
// ADMIN CONTROLLERS
// ============================================

/**
 * Atualizar professor (admin only)
 */
export async function adminUpdateTeacher(req, res) {
  try {
    const { id } = req.params;
    const { teacher_code, image_url } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (teacher_code !== undefined) {
      updates.push(`teacher_code = $${paramCount++}`);
      values.push(teacher_code);
    }
    if (image_url !== undefined) {
      updates.push(`image_url = $${paramCount++}`);
      values.push(image_url);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const result = await query(
      `UPDATE teachers SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Teacher code already exists' });
    }
    console.error('Error updating teacher:', error);
    res.status(500).json({ error: 'Failed to update teacher' });
  }
}

/**
 * Remover professor (admin only)
 */
export async function adminDeleteTeacher(req, res) {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM teachers WHERE id = $1 RETURNING id, teacher_code',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    res.json({ message: 'Teacher deleted', teacher: result.rows[0] });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    res.status(500).json({ error: 'Failed to delete teacher' });
  }
}

