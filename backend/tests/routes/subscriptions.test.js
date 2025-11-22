import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { cleanupTestDB, createTestUser, createTestPlan, createTestTeacher, createTestSubscription, getAuthToken } from '../helpers/setup.js';

describe('Subscriptions Routes', () => {
  let adminUser, adminToken, studentUser, studentToken, plan, teacher;

  beforeEach(async () => {
    await cleanupTestDB();
    adminUser = await createTestUser('admin');
    adminToken = getAuthToken(adminUser);
    studentUser = await createTestUser('student');
    studentToken = getAuthToken(studentUser);
    plan = await createTestPlan();
    const teacherUser = await createTestUser('teacher');
    teacher = await createTestTeacher(teacherUser.id);
  });

  describe('POST /api/subscriptions', () => {
    it('should create subscription successfully', async () => {
      const response = await request(app)
        .post('/api/subscriptions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ plan_id: plan.id, teacher_id: teacher.id });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });

    it('should return error for invalid plan_id', async () => {
      const response = await request(app)
        .post('/api/subscriptions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ plan_id: '00000000-0000-0000-0000-000000000000' });

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/subscriptions/user/:userId', () => {
    it('should get user subscription successfully', async () => {
      await createTestSubscription(studentUser.id, plan.id, teacher.id);

      const response = await request(app)
        .get(`/api/subscriptions/user/${studentUser.id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('plan_id', plan.id);
    });

    it('should return error for non-existent subscription', async () => {
      const response = await request(app)
        .get(`/api/subscriptions/user/${studentUser.id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/subscriptions/:id', () => {
    it('should update subscription successfully', async () => {
      const subscription = await createTestSubscription(studentUser.id, plan.id, teacher.id);

      const response = await request(app)
        .put(`/api/subscriptions/${subscription.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ is_active: false });

      expect(response.status).toBe(200);
    });

    it('should return error for non-existent subscription', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .put(`/api/subscriptions/${fakeId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ is_active: false });

      expect(response.status).toBe(404);
    });

    it('should return error for access denied', async () => {
      const otherUser = await createTestUser('student');
      const otherToken = getAuthToken(otherUser);
      const subscription = await createTestSubscription(studentUser.id, plan.id, teacher.id);

      const response = await request(app)
        .put(`/api/subscriptions/${subscription.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ is_active: false });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/subscriptions/admin/subscriptions', () => {
    it('should list subscriptions successfully (admin)', async () => {
      await createTestSubscription(studentUser.id, plan.id, teacher.id);

      const response = await request(app)
        .get('/api/subscriptions/admin/subscriptions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return error for non-admin', async () => {
      const response = await request(app)
        .get('/api/subscriptions/admin/subscriptions')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/subscriptions/admin/subscriptions', () => {
    it('should create subscription successfully (admin)', async () => {
      const response = await request(app)
        .post('/api/subscriptions/admin/subscriptions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ user_id: studentUser.id, plan_id: plan.id, teacher_id: teacher.id });

      expect(response.status).toBe(201);
    });

    it('should return error for invalid plan_id', async () => {
      const response = await request(app)
        .post('/api/subscriptions/admin/subscriptions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ user_id: studentUser.id, plan_id: '00000000-0000-0000-0000-000000000000' });

      expect(response.status).toBe(500);
    });
  });

  describe('PUT /api/subscriptions/admin/subscriptions/:id', () => {
    it('should update subscription successfully (admin)', async () => {
      const subscription = await createTestSubscription(studentUser.id, plan.id, teacher.id);

      const response = await request(app)
        .put(`/api/subscriptions/admin/subscriptions/${subscription.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ is_active: false });

      expect(response.status).toBe(200);
    });
  });
});

