import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import * as usersController from '../controllers/users.js';

const router = express.Router();

// Rotas públicas
router.post('/', usersController.createUser);
router.get('/:id', usersController.getUser);
router.put('/:id', authenticateToken, usersController.updateUser);
router.get('/:id/metrics', authenticateToken, usersController.getUserMetricsController);

// Rotas admin
router.get('/admin/users', authenticateToken, requireRole('admin'), usersController.listUsers);
router.get('/admin/users/:id', authenticateToken, requireRole('admin'), usersController.getUserDetails);
router.post('/admin/users', authenticateToken, requireRole('admin'), usersController.adminCreateUser);
router.put('/admin/users/:id', authenticateToken, requireRole('admin'), usersController.adminUpdateUser);
router.delete('/admin/users/:id', authenticateToken, requireRole('admin'), usersController.adminDeleteUser);

export default router;

