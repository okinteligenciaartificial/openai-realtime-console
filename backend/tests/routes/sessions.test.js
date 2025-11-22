import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { cleanupTestDB, createTestUser, createTestSession, createTestSessionMetrics, getAuthToken } from '../helpers/setup.js';

describe('Sessions Routes', () => {
  let adminUser, adminToken, studentUser, studentToken;

  beforeEach(async () => {
    await cleanupTestDB();
    adminUser = await createTestUser('admin');
    adminToken = getAuthToken(adminUser);
    studentUser = await createTestUser('student');
    studentToken = getAuthToken(studentUser);
  });

  describe('POST /api/sessions', () => {
    it('should create session successfully', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ session_id: 'test-session-123', model: 'gpt-4o-mini-realtime-preview' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });

    it('should return error without authentication', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .send({ session_id: 'test-session-123' });

      expect(response.status).toBe(401);
    });

    it('should return error for missing session_id', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ model: 'gpt-4o-mini-realtime-preview' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/sessions/user/:userId', () => {
    it('should get user sessions successfully', async () => {
      await createTestSession(studentUser.id);

      const response = await request(app)
        .get(`/api/sessions/user/${studentUser.id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return error for access denied', async () => {
      const otherUser = await createTestUser('student');
      const response = await request(app)
        .get(`/api/sessions/user/${otherUser.id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/sessions/:sessionId/finalize', () => {
    it('should finalize session successfully', async () => {
      const session = await createTestSession(studentUser.id);

      const response = await request(app)
        .post(`/api/sessions/${session.session_id}/finalize`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ duration_seconds: 300 });

      expect(response.status).toBe(200);
    });

    it('should return error for non-existent session', async () => {
      const response = await request(app)
        .post('/api/sessions/non-existent-session/finalize')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ duration_seconds: 300 });

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/sessions/:sessionId/metrics', () => {
    it('should add metrics successfully', async () => {
      const session = await createTestSession(studentUser.id);

      const response = await request(app)
        .post(`/api/sessions/${session.session_id}/metrics`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          input_tokens: 1000,
          output_tokens: 500,
        });

      expect(response.status).toBe(200);
    });

    it('should return error for non-existent session', async () => {
      const response = await request(app)
        .post('/api/sessions/non-existent-session/metrics')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          input_tokens: 1000,
          output_tokens: 500,
        });

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/sessions/admin/sessions', () => {
    it('should list sessions successfully (admin)', async () => {
      await createTestSession(studentUser.id);

      const response = await request(app)
        .get('/api/sessions/admin/sessions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/sessions/admin/sessions/stats', () => {
    it('should get session stats successfully (admin)', async () => {
      const session = await createTestSession(studentUser.id);
      await createTestSessionMetrics(session.session_id);

      const response = await request(app)
        .get('/api/sessions/admin/sessions/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total_sessions');
    });
  });

  describe('POST /api/sessions/:sessionId/events', () => {
    it('should log event successfully', async () => {
      const session = await createTestSession(studentUser.id);

      const response = await request(app)
        .post(`/api/sessions/${session.session_id}/events`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          event_type: 'test_event',
          input_tokens: 100,
          output_tokens: 50,
        });

      expect(response.status).toBe(200);
    });
  });
});

