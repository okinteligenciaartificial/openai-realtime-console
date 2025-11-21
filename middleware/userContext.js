import { query } from '../services/database.js';

/**
 * Middleware para extrair e validar user_id
 * Sem autenticação inicial - user_id via header ou query param
 */
export async function userContext(req, res, next) {
  try {
    // Tentar obter user_id do header X-User-Id
    let userId = req.headers['x-user-id'];
    
    // Se não estiver no header, tentar query param
    if (!userId) {
      userId = req.query.user_id;
    }

    // Se ainda não tiver, tentar do body (para POST)
    if (!userId && req.body && req.body.user_id) {
      userId = req.body.user_id;
    }

    if (!userId) {
      return res.status(400).json({ error: 'user_id is required (header X-User-Id, query param user_id, or body user_id)' });
    }

    // Validar se o usuário existe e está ativo
    const result = await query(
      'SELECT id, email, name, role, is_active FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'User account is inactive' });
    }

    // Adicionar informações do usuário ao request
    req.userId = userId;
    req.user = user;

    next();
  } catch (error) {
    console.error('Error in userContext middleware:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Middleware opcional - apenas extrai user_id sem validar
 */
export function optionalUserContext(req, res, next) {
  let userId = req.headers['x-user-id'] || req.query.user_id;
  
  if (req.body && req.body.user_id) {
    userId = req.body.user_id;
  }

  if (userId) {
    req.userId = userId;
  }

  next();
}

