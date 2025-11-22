import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { cleanupTestDB, createTestUser, getAuthToken } from '../helpers/setup.js';

describe('Auth Routes', () => {
  beforeEach(async () => {
    await cleanupTestDB();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new student successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'student@test.com',
          name: 'Test Student',
          password: 'TestPassword123!',
          role: 'student',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('student@test.com');
      expect(response.body.user.role).toBe('student');
      expect(response.body.user).not.toHaveProperty('password_hash');
    });

    it('should register a new teacher successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'teacher@test.com',
          name: 'Test Teacher',
          password: 'TestPassword123!',
          role: 'teacher',
        });

      expect(response.status).toBe(201);
      expect(response.body.user.role).toBe('teacher');
    });

    it('should register a new admin successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'admin@test.com',
          name: 'Test Admin',
          password: 'TestPassword123!',
          role: 'admin',
        });

      expect(response.status).toBe(201);
      expect(response.body.user.role).toBe('admin');
    });

    it('should return error for duplicate email', async () => {
      await createTestUser('student', { email: 'duplicate@test.com' });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@test.com',
          name: 'Duplicate User',
          password: 'TestPassword123!',
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          name: 'Test User',
          password: 'TestPassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error for missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          // name missing
          password: 'TestPassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error for weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          name: 'Test User',
          password: '123', // weak password
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const user = await createTestUser('student', {
        email: 'login@test.com',
        password: 'TestPassword123!',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'TestPassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('login@test.com');
      expect(response.body.user).not.toHaveProperty('password_hash');
    });

    it('should return error for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'TestPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error for invalid password', async () => {
      await createTestUser('student', {
        email: 'login2@test.com',
        password: 'CorrectPassword123!',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login2@test.com',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error for missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com',
          // password missing
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error for inactive user', async () => {
      const user = await createTestUser('student', {
        email: 'inactive@test.com',
        password: 'TestPassword123!',
      });

      // Desativar usuário
      const { query } = await import('../../src/services/database.js');
      await query('UPDATE users SET is_active = false WHERE id = $1', [user.id]);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'inactive@test.com',
          password: 'TestPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user data with valid token', async () => {
      const user = await createTestUser('student', {
        email: 'me@test.com',
      });
      const token = getAuthToken(user);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', user.id);
      expect(response.body).toHaveProperty('email', user.email);
      expect(response.body).not.toHaveProperty('password_hash');
    });

    it('should return error without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error with expired token', async () => {
      const user = await createTestUser('student');
      const jwt = await import('jsonwebtoken');
      
      // Criar token expirado manualmente
      const expiredToken = jwt.default.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        { expiresIn: '1s' } // Token expira em 1 segundo
      );

      // Aguardar 2 segundos para garantir que expirou
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error with malformed token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not.a.valid.jwt.token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
});

