import { verifyToken } from '../services/auth.js';
import { query } from '../services/database.js';

/**
 * Middleware de autenticação JWT
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(403).json({ error: 'Token inválido ou expirado' });
  }

  // Adicionar informações do usuário ao request
  req.userId = decoded.id;
  req.user = {
    id: decoded.id,
    email: decoded.email,
    role: decoded.role,
  };

  next();
}

/**
 * Middleware para verificar role específica
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado. Permissão insuficiente.' });
    }

    next();
  };
}

/**
 * Middleware combinado: autenticação + verificação de role
 */
export function requireAuthAndRole(...roles) {
  return [authenticateToken, requireRole(...roles)];
}

/**
 * Middleware opcional - tenta autenticar mas não bloqueia se não tiver token
 */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      // Buscar dados atualizados do usuário
      try {
        const result = await query(
          'SELECT id, email, name, role, is_active FROM users WHERE id = $1',
          [decoded.id]
        );

        if (result.rows.length > 0 && result.rows[0].is_active) {
          req.userId = decoded.id;
          req.user = result.rows[0];
        }
      } catch (error) {
        console.error('Error in optionalAuth:', error);
      }
    }
  }

  next();
}

