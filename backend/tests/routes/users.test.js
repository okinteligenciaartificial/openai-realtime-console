import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { cleanupTestDB, createTestUser, getAuthToken } from '../helpers/setup.js';

describe('Users Routes', () => {
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

  describe('GET /api/users/admin/users', () => {
    it('should list all users successfully (admin)', async () => {
      await createTestUser('student');
      await createTestUser('teacher');

      const response = await request(app)
        .get('/api/users/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users.length).toBeGreaterThanOrEqual(3); // admin + 2 created
    });

    it('should return error without authentication', async () => {
      const response = await request(app)
        .get('/api/users/admin/users');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error for non-admin user', async () => {
      const response = await request(app)
        .get('/api/users/admin/users')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('should filter users by role', async () => {
      await createTestUser('student');
      await createTestUser('teacher');

      const response = await request(app)
        .get('/api/users/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ role: 'student' });

      expect(response.status).toBe(200);
      expect(response.body.users.every(u => u.role === 'student')).toBe(true);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by id successfully (own user)', async () => {
      const response = await request(app)
        .get(`/api/users/${studentUser.id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', studentUser.id);
      expect(response.body).toHaveProperty('email', studentUser.email);
      expect(response.body).not.toHaveProperty('password_hash');
    });

    it('should get user by id successfully (admin)', async () => {
      const response = await request(app)
        .get(`/api/users/${studentUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', studentUser.id);
    });

    it('should return error for non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error when accessing other user (non-admin)', async () => {
      const otherUser = await createTestUser('student');
      const response = await request(app)
        .get(`/api/users/${otherUser.id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/users/admin/users', () => {
    it('should create user successfully (admin)', async () => {
      const response = await request(app)
        .post('/api/users/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newuser@test.com',
          name: 'New User',
          role: 'student',
          password: 'TestPassword123!',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', 'newuser@test.com');
      expect(response.body).toHaveProperty('role', 'student');
      expect(response.body).not.toHaveProperty('password_hash');
    });

    it('should return error for duplicate email', async () => {
      await createTestUser('student', { email: 'duplicate@test.com' });

      const response = await request(app)
        .post('/api/users/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'duplicate@test.com',
          name: 'Duplicate User',
          role: 'student',
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error for missing required fields', async () => {
      const response = await request(app)
        .post('/api/users/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'test@test.com',
          // name missing
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error for non-admin user', async () => {
      const response = await request(app)
        .post('/api/users/admin/users')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          email: 'test@test.com',
          name: 'Test User',
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/users/admin/users/:id', () => {
    it('should update user successfully (admin)', async () => {
      const user = await createTestUser('student');

      const response = await request(app)
        .put(`/api/users/admin/users/${user.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Name',
          is_active: false,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'Updated Name');
      expect(response.body).toHaveProperty('is_active', false);
    });

    it('should return error for non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .put(`/api/users/admin/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Name',
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error for non-admin user', async () => {
      const user = await createTestUser('student');
      const response = await request(app)
        .put(`/api/users/admin/users/${user.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          name: 'Updated Name',
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error for duplicate email', async () => {
      const user1 = await createTestUser('student', { email: 'user1@test.com' });
      const user2 = await createTestUser('student', { email: 'user2@test.com' });

      const response = await request(app)
        .put(`/api/users/admin/users/${user2.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'user1@test.com', // Email já usado por user1
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/users/admin/users/:id', () => {
    it('should delete user successfully (admin)', async () => {
      const user = await createTestUser('student');

      const response = await request(app)
        .delete(`/api/users/admin/users/${user.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');

      // Verificar que o usuário foi deletado
      const checkResponse = await request(app)
        .get(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(checkResponse.status).toBe(404);
    });

    it('should return error for non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .delete(`/api/users/admin/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error for non-admin user', async () => {
      const user = await createTestUser('student');
      const response = await request(app)
        .delete(`/api/users/admin/users/${user.id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    // Note: The current implementation allows admin to deactivate themselves
    // This test verifies the current behavior
    it('should allow admin to deactivate themselves (current behavior)', async () => {
      const response = await request(app)
        .delete(`/api/users/admin/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Current implementation allows this (soft delete)
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });
});

