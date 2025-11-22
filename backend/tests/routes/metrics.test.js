import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { cleanupTestDB, createTestUser, createTestSession, createTestSessionMetrics, getAuthToken } from '../helpers/setup.js';

describe('Metrics Routes', () => {
  let adminUser, adminToken, studentUser, studentToken;

  beforeEach(async () => {
    await cleanupTestDB();
    adminUser = await createTestUser('admin');
    adminToken = getAuthToken(adminUser);
    studentUser = await createTestUser('student');
    studentToken = getAuthToken(studentUser);
  });

  describe('GET /api/metrics/summary/:userId', () => {
    it('should get user metrics summary successfully', async () => {
      const session = await createTestSession(studentUser.id);
      await createTestSessionMetrics(session.id);

      const response = await request(app)
        .get(`/api/metrics/summary/${studentUser.id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user_id', studentUser.id);
    });

    it('should return error for access denied', async () => {
      const otherUser = await createTestUser('student');
      const response = await request(app)
        .get(`/api/metrics/summary/${otherUser.id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/metrics/sessions/:userId', () => {
    it('should get user sessions metrics successfully', async () => {
      await createTestSession(studentUser.id);

      const response = await request(app)
        .get(`/api/metrics/sessions/${studentUser.id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/metrics/export/:userId', () => {
    it('should export user metrics successfully', async () => {
      const session = await createTestSession(studentUser.id);
      await createTestSessionMetrics(session.id);

      const response = await request(app)
        .get(`/api/metrics/export/${studentUser.id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
    });

    it('should return error for access denied', async () => {
      const otherUser = await createTestUser('student');
      const response = await request(app)
        .get(`/api/metrics/export/${otherUser.id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/metrics/admin/stats/overview', () => {
    it('should get overview stats successfully (admin)', async () => {
      const response = await request(app)
        .get('/api/metrics/admin/stats/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total_users');
    });

    it('should return error for non-admin', async () => {
      const response = await request(app)
        .get('/api/metrics/admin/stats/overview')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/metrics/admin/stats/users', () => {
    it('should get user stats successfully (admin)', async () => {
      const response = await request(app)
        .get('/api/metrics/admin/stats/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/metrics/admin/stats/costs', () => {
    it('should get cost stats successfully (admin)', async () => {
      const response = await request(app)
        .get('/api/metrics/admin/stats/costs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/metrics/admin/stats/usage', () => {
    it('should get usage stats successfully (admin)', async () => {
      const response = await request(app)
        .get('/api/metrics/admin/stats/usage')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});

