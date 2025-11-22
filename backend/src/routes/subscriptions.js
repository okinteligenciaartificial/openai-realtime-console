import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import * as subscriptionsController from '../controllers/subscriptions.js';

const router = express.Router();

// Rotas públicas/autenticadas
router.post('/', authenticateToken, subscriptionsController.createSubscription);
router.get('/user/:userId', authenticateToken, subscriptionsController.getUserSubscription);
router.put('/:id', authenticateToken, subscriptionsController.updateSubscription);

// Rotas admin
router.get('/admin/subscriptions', authenticateToken, requireRole('admin'), subscriptionsController.adminListSubscriptions);
router.get('/admin/subscriptions/:id', authenticateToken, requireRole('admin'), subscriptionsController.adminGetSubscription);
router.post('/admin/subscriptions', authenticateToken, requireRole('admin'), subscriptionsController.adminCreateSubscription);
router.put('/admin/subscriptions/:id', authenticateToken, requireRole('admin'), subscriptionsController.adminUpdateSubscription);

export default router;

