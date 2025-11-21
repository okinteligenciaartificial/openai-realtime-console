import express from 'express';
import { query } from '../services/database.js';
import { userContext } from '../middleware/userContext.js';

const router = express.Router();

// Criar professor
router.post('/', async (req, res) => {
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
});

// Listar professores
router.get('/', async (req, res) => {
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
});

// Obter alunos de um professor
router.get('/:id/students', async (req, res) => {
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
});

// Obter resumo de alunos por professor
router.get('/:id/summary', async (req, res) => {
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
});

export default router;

