import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import * as metricsController from '../controllers/metrics.js';

const router = express.Router();

// Rotas públicas/autenticadas
router.get('/summary/:userId', authenticateToken, metricsController.getMetricsSummary);
router.get('/sessions/:userId', authenticateToken, metricsController.getUserSessionsMetrics);
router.get('/export/:userId', authenticateToken, metricsController.exportData);

// Rotas admin
router.get('/admin/stats/overview', authenticateToken, requireRole('admin'), metricsController.getOverviewStats);
router.get('/admin/stats/users', authenticateToken, requireRole('admin'), metricsController.getUserStats);
router.get('/admin/stats/costs', authenticateToken, requireRole('admin'), metricsController.getCostStats);
router.get('/admin/stats/usage', authenticateToken, requireRole('admin'), metricsController.getUsageStats);

export default router;

