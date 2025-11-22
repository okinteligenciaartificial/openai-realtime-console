import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import * as sessionsController from '../controllers/sessions.js';

const router = express.Router();

// Rotas públicas/autenticadas
router.post('/', authenticateToken, sessionsController.createSessionController);
router.post('/:sessionId/metrics', authenticateToken, sessionsController.updateSessionMetricsController);
router.post('/:sessionId/finalize', authenticateToken, sessionsController.finalizeSessionController);
router.get('/:sessionId', authenticateToken, sessionsController.getSessionController);
router.get('/user/:userId', authenticateToken, sessionsController.getUserSessionsController);
router.post('/:sessionId/events', authenticateToken, sessionsController.logEvent);

// Rotas admin
router.get('/admin/sessions', authenticateToken, requireRole('admin'), sessionsController.listSessions);
router.get('/admin/sessions/stats', authenticateToken, requireRole('admin'), sessionsController.getSessionStats);

export default router;

