import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from './database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Gera hash da senha
 */
export async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verifica senha
 */
export async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Gera token JWT
 */
export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verifica token JWT
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Autentica usuário (login)
 */
export async function authenticateUser(email, password) {
  try {
    const result = await query(
      'SELECT id, email, name, role, password_hash, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Invalid email or password' };
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return { success: false, error: 'User account is inactive' };
    }

    // Se não tem senha, permitir login sem senha (para desenvolvimento)
    if (!user.password_hash) {
      const token = generateToken(user);
      return {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    }

    const isValid = await verifyPassword(password, user.password_hash);

    if (!isValid) {
      return { success: false, error: 'Invalid email or password' };
    }

    const token = generateToken(user);

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  } catch (error) {
    console.error('Error authenticating user:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Atualiza senha do usuário
 */
export async function updateUserPassword(userId, newPassword) {
  try {
    const hashedPassword = await hashPassword(newPassword);
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, userId]
    );
    return { success: true };
  } catch (error) {
    console.error('Error updating password:', error);
    return { success: false, error: 'Failed to update password' };
  }
}

