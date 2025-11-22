import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as authController from '../controllers/auth.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Login do usuário
 */
router.post('/login', authController.login);

/**
 * POST /api/auth/register
 * Registro de novo usuário
 */
router.post('/register', authController.register);

/**
 * GET /api/auth/me
 * Obter informações do usuário autenticado
 */
router.get('/me', authenticateToken, authController.me);

/**
 * PUT /api/auth/password
 * Atualizar senha do usuário autenticado
 */
router.put('/password', authenticateToken, authController.updatePassword);

export default router;

