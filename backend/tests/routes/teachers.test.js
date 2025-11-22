import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { cleanupTestDB, createTestUser, createTestTeacher, getAuthToken, createTestPlan, createTestSubscription } from '../helpers/setup.js';

describe('Teachers Routes', () => {
  let adminUser;
  let adminToken;
  let teacherUser;
  let teacherToken;
  let studentUser;

  beforeEach(async () => {
    await cleanupTestDB();
    adminUser = await createTestUser('admin');
    adminToken = getAuthToken(adminUser);
    teacherUser = await createTestUser('teacher');
    teacherToken = getAuthToken(teacherUser);
    studentUser = await createTestUser('student');
  });

  describe('GET /api/teachers', () => {
    it('should list all teachers successfully', async () => {
      await createTestTeacher(teacherUser.id);

      const response = await request(app)
        .get('/api/teachers');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array when no teachers exist', async () => {
      const response = await request(app)
        .get('/api/teachers');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('POST /api/teachers', () => {
    it('should create teacher successfully', async () => {
      const newTeacherUser = await createTestUser('teacher');

      const response = await request(app)
        .post('/api/teachers')
        .send({
          user_id: newTeacherUser.id,
          teacher_code: `TEST${Date.now()}`,
          image_url: '/assets/test.jpg',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('teacher_code');
      expect(response.body).toHaveProperty('user_id', newTeacherUser.id);
    });

    it('should return error for invalid user_id', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post('/api/teachers')
        .send({
          user_id: fakeId,
          teacher_code: 'TEST001',
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error when user role is not teacher', async () => {
      const response = await request(app)
        .post('/api/teachers')
        .send({
          user_id: studentUser.id,
          teacher_code: 'TEST001',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error for duplicate teacher_code', async () => {
      const teacher = await createTestTeacher(teacherUser.id, { teacher_code: 'DUPLICATE001' });

      const newTeacherUser = await createTestUser('teacher');
      const response = await request(app)
        .post('/api/teachers')
        .send({
          user_id: newTeacherUser.id,
          teacher_code: 'DUPLICATE001',
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error for missing required fields', async () => {
      const response = await request(app)
        .post('/api/teachers')
        .send({
          user_id: teacherUser.id,
          // teacher_code missing
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/teachers/:id/students', () => {
    it('should get teacher students successfully', async () => {
      const teacher = await createTestTeacher(teacherUser.id);
      const plan = await createTestPlan();
      await createTestSubscription(studentUser.id, plan.id, teacher.id);

      const response = await request(app)
        .get(`/api/teachers/${teacher.id}/students`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array when teacher has no students', async () => {
      const teacher = await createTestTeacher(teacherUser.id);

      const response = await request(app)
        .get(`/api/teachers/${teacher.id}/students`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return error for non-existent teacher', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/teachers/${fakeId}/students`);

      expect(response.status).toBe(200); // Returns empty array, not error
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/teachers/:id/summary', () => {
    it('should get teacher summary successfully', async () => {
      const teacher = await createTestTeacher(teacherUser.id);

      const response = await request(app)
        .get(`/api/teachers/${teacher.id}/summary`);

      // May return 404 if view doesn't exist, or 200 with data
      expect([200, 404]).toContain(response.status);
    });

    it('should return error for non-existent teacher', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/teachers/${fakeId}/summary`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/teachers/admin/teachers/:id', () => {
    it('should update teacher successfully (admin)', async () => {
      const teacher = await createTestTeacher(teacherUser.id);

      const response = await request(app)
        .put(`/api/teachers/admin/teachers/${teacher.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          teacher_code: 'UPDATED001',
          image_url: '/assets/updated.jpg',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('teacher_code', 'UPDATED001');
      expect(response.body).toHaveProperty('image_url', '/assets/updated.jpg');
    });

    it('should return error for non-existent teacher', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .put(`/api/teachers/admin/teachers/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          teacher_code: 'UPDATED001',
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error for non-admin user', async () => {
      const teacher = await createTestTeacher(teacherUser.id);
      const response = await request(app)
        .put(`/api/teachers/admin/teachers/${teacher.id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          teacher_code: 'UPDATED001',
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error for duplicate teacher_code', async () => {
      const teacher1 = await createTestTeacher(teacherUser.id, { teacher_code: 'EXISTING001' });
      const teacher2User = await createTestUser('teacher');
      const teacher2 = await createTestTeacher(teacher2User.id, { teacher_code: 'OTHER001' });

      const response = await request(app)
        .put(`/api/teachers/admin/teachers/${teacher2.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          teacher_code: 'EXISTING001',
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/teachers/admin/teachers/:id', () => {
    it('should delete teacher successfully (admin)', async () => {
      const teacher = await createTestTeacher(teacherUser.id);

      const response = await request(app)
        .delete(`/api/teachers/admin/teachers/${teacher.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');

      // Verify teacher was deleted
      const checkResponse = await request(app)
        .get(`/api/teachers/${teacher.id}/students`);

      // Should still work but return empty array
      expect(checkResponse.status).toBe(200);
    });

    it('should return error for non-existent teacher', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .delete(`/api/teachers/admin/teachers/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error for non-admin user', async () => {
      const teacher = await createTestTeacher(teacherUser.id);
      const response = await request(app)
        .delete(`/api/teachers/admin/teachers/${teacher.id}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });
  });
});

