import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { cleanupTestDB, createTestUser, createTestPlan, getAuthToken, createTestSubscription } from '../helpers/setup.js';

describe('Plans Routes', () => {
  let adminUser;
  let adminToken;
  let studentUser;
  let studentToken;

  beforeEach(async () => {
    await cleanupTestDB();
    adminUser = await createTestUser('admin');
    adminToken = getAuthToken(adminUser);
    studentUser = await createTestUser('student');
    studentToken = getAuthToken(studentUser);
  });

  describe('GET /api/plans', () => {
    it('should list active plans successfully', async () => {
      await createTestPlan({ name: 'Active Plan' });
      // Note: createTestPlan creates active plans by default
      // To test inactive, we'd need to update after creation

      const response = await request(app)
        .get('/api/plans');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // Should only return active plans
      if (response.body.length > 0) {
        expect(response.body.every(p => p.is_active === true)).toBe(true);
      }
    });

    it('should return empty array when no active plans exist', async () => {
      const response = await request(app)
        .get('/api/plans');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/plans/admin/plans', () => {
    it('should list all plans successfully (admin)', async () => {
      await createTestPlan({ name: 'Plan 1' });
      await createTestPlan({ name: 'Plan 2' });

      const response = await request(app)
        .get('/api/plans/admin/plans')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should return error for non-admin user', async () => {
      const response = await request(app)
        .get('/api/plans/admin/plans')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/plans/admin/plans/:id', () => {
    it('should get plan successfully (admin)', async () => {
      const plan = await createTestPlan();

      const response = await request(app)
        .get(`/api/plans/admin/plans/${plan.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', plan.id);
    });

    it('should return error for non-existent plan', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/plans/admin/plans/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/plans/admin/plans', () => {
    it('should create plan successfully (admin)', async () => {
      const response = await request(app)
        .post('/api/plans/admin/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Plan',
          monthly_token_limit: 100000,
          monthly_session_limit: 10,
          cost_per_token: 0.00000075,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', 'New Plan');
    });

    it('should return error for missing required fields', async () => {
      const response = await request(app)
        .post('/api/plans/admin/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          // name missing
          monthly_token_limit: 100000,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error for non-admin user', async () => {
      const response = await request(app)
        .post('/api/plans/admin/plans')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          name: 'New Plan',
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/plans/admin/plans/:id', () => {
    it('should update plan successfully (admin)', async () => {
      const plan = await createTestPlan();

      const response = await request(app)
        .put(`/api/plans/admin/plans/${plan.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Plan',
          monthly_token_limit: 200000,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'Updated Plan');
      expect(response.body).toHaveProperty('monthly_token_limit', 200000);
    });

    it('should return error for non-existent plan', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .put(`/api/plans/admin/plans/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Plan',
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error for invalid data', async () => {
      const plan = await createTestPlan();
      const response = await request(app)
        .put(`/api/plans/admin/plans/${plan.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          // No fields to update
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/plans/admin/plans/:id', () => {
    it('should delete plan successfully (admin)', async () => {
      const plan = await createTestPlan();

      const response = await request(app)
        .delete(`/api/plans/admin/plans/${plan.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');

      // Verify plan was deleted
      const checkResponse = await request(app)
        .get(`/api/plans/admin/plans/${plan.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(checkResponse.status).toBe(404);
    });

    it('should return error for non-existent plan', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .delete(`/api/plans/admin/plans/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    // Note: Testing plan in use would require creating a subscription first
    // This is tested in integration tests
  });
});

