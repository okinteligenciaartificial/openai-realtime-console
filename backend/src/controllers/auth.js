import { authenticateUser, updateUserPassword, hashPassword, verifyPassword } from '../services/auth.js';
import { query } from '../services/database.js';

/**
 * POST /api/auth/login
 * Login do usuário
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    // Se não forneceu senha, tentar login sem senha (para desenvolvimento)
    const result = await authenticateUser(email, password || '');

    if (!result.success) {
      return res.status(401).json({ error: result.error });
    }

    res.json({
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
}

/**
 * POST /api/auth/register
 * Registro de novo usuário
 */
export async function register(req, res) {
  try {
    const { email, name, password, role = 'student' } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'Email e nome são obrigatórios' });
    }

    // Hash da senha se fornecida
    let passwordHash = null;
    if (password) {
      passwordHash = await hashPassword(password);
    }

    const result = await query(
      `INSERT INTO users (email, name, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, email, name, role, is_active, created_at`,
      [email, name, passwordHash, role]
    );

    const user = result.rows[0];

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }
    console.error('Error in register:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
}

/**
 * GET /api/auth/me
 * Obter informações do usuário autenticado
 */
export async function me(req, res) {
  try {
    const result = await query(
      'SELECT id, email, name, role, is_active, created_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({ error: 'Erro ao obter informações do usuário' });
  }
}

/**
 * PUT /api/auth/password
 * Atualizar senha do usuário autenticado
 */
export async function updatePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'Nova senha é obrigatória' });
    }

    // Verificar senha atual se o usuário já tem senha
    const userResult = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.userId]
    );

    if (userResult.rows.length > 0 && userResult.rows[0].password_hash) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Senha atual é obrigatória' });
      }

      const isValid = await verifyPassword(currentPassword, userResult.rows[0].password_hash);

      if (!isValid) {
        return res.status(401).json({ error: 'Senha atual incorreta' });
      }
    }

    const result = await updateUserPassword(req.userId, newPassword);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ message: 'Senha atualizada com sucesso' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Erro ao atualizar senha' });
  }
}

