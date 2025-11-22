import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import * as plansController from '../controllers/plans.js';

const router = express.Router();

// Rotas públicas
router.get('/', plansController.listPlans);

// Rotas admin
router.get('/admin/plans', authenticateToken, requireRole('admin'), plansController.adminListPlans);
router.get('/admin/plans/:id', authenticateToken, requireRole('admin'), plansController.adminGetPlan);
router.post('/admin/plans', authenticateToken, requireRole('admin'), plansController.adminCreatePlan);
router.put('/admin/plans/:id', authenticateToken, requireRole('admin'), plansController.adminUpdatePlan);
router.delete('/admin/plans/:id', authenticateToken, requireRole('admin'), plansController.adminDeletePlan);

export default router;

