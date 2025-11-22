import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import * as teachersController from '../controllers/teachers.js';

const router = express.Router();

// Rotas públicas
router.post('/', teachersController.createTeacher);
router.get('/', teachersController.listTeachers);
router.get('/:id/students', teachersController.getTeacherStudents);
router.get('/:id/summary', teachersController.getTeacherSummary);

// Rotas admin
router.put('/admin/teachers/:id', authenticateToken, requireRole('admin'), teachersController.adminUpdateTeacher);
router.delete('/admin/teachers/:id', authenticateToken, requireRole('admin'), teachersController.adminDeleteTeacher);

export default router;

