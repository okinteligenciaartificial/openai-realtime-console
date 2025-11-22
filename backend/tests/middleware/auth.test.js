import { describe, it, expect, beforeEach } from 'vitest';
import { authenticateToken, requireRole } from '../../src/middleware/auth.js';
import { generateToken } from '../../src/services/auth.js';
import { createTestUser, cleanupTestDB } from '../helpers/setup.js';

describe('Auth Middleware', () => {
  beforeEach(async () => {
    await cleanupTestDB();
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token', async () => {
      const user = await createTestUser('student');
      const token = generateToken(user);

      const req = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };
      const res = {};
      let nextCalled = false;

      await authenticateToken(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
      expect(req.userId).toBe(user.id);
      expect(req.user).toHaveProperty('id', user.id);
    });

    it('should reject request without token', async () => {
      const req = { headers: {} };
      const res = {
        status: (code) => ({
          json: (data) => {
            expect(code).toBe(401);
            expect(data).toHaveProperty('error');
          },
        }),
      };

      await authenticateToken(req, res, () => {
        throw new Error('Should not call next');
      });
    });

    it('should reject invalid token', async () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      };
      const res = {
        status: (code) => ({
          json: (data) => {
            expect(code).toBe(403);
            expect(data).toHaveProperty('error');
          },
        }),
      };

      await authenticateToken(req, res, () => {
        throw new Error('Should not call next');
      });
    });
  });

  describe('requireRole', () => {
    it('should allow access for correct role', async () => {
      const user = await createTestUser('admin');
      const token = generateToken(user);

      const req = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };
      const res = {
        status: () => res,
        json: () => res,
      };
      let nextCalled = false;
      let roleNextCalled = false;

      await authenticateToken(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);

      const middleware = requireRole('admin');
      middleware(req, res, () => {
        roleNextCalled = true;
      });

      expect(roleNextCalled).toBe(true);
    });

    it('should deny access for incorrect role', async () => {
      const user = await createTestUser('student');
      const token = generateToken(user);

      const req = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };
      const res = {
        status: (code) => ({
          json: (data) => {
            expect(code).toBe(403);
            expect(data).toHaveProperty('error');
          },
        }),
      };

      await authenticateToken(req, res, () => {});

      const middleware = requireRole('admin');
      middleware(req, res, () => {
        throw new Error('Should not call next');
      });
    });
  });
});

