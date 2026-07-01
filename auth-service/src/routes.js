const express = require('express');
const authenticationModule = require('./auth');
const databaseModule = require('./db');
const { createAuthMiddleware } = require('./middleware');

function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateRegistration(body) {
  if (!body || typeof body !== 'object') {
    return 'Request body is required';
  }

  if (typeof body.email !== 'string' || !isValidEmail(normalizeEmail(body.email))) {
    return 'A valid email is required';
  }

  if (body.email.length > 320) {
    return 'Email is too long';
  }

  if (typeof body.password !== 'string' || body.password.length === 0) {
    return 'Password is required';
  }

  if (typeof body.name !== 'undefined' && typeof body.name !== 'string') {
    return 'Name must be a string';
  }

  if ((body.name || '').length > 120) {
    return 'Name is too long';
  }

  return null;
}

function createRoutes({
  database = databaseModule,
  authentication = authenticationModule,
} = {}) {
  const router = express.Router();
  const requireAuthentication = createAuthMiddleware(authentication);

  router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  router.post(
    '/register',
    asyncHandler(async (req, res) => {
      const validationError = validateRegistration(req.body);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const email = normalizeEmail(req.body.email);
      const name = (req.body.name || '').trim();
      const passwordHash = await authentication.hashPassword(req.body.password);

      try {
        const user = await database.createUser({
          email,
          passwordHash,
          name,
        });
        return res.status(201).json(user);
      } catch (error) {
        if (error.code === '23505') {
          return res.status(409).json({ error: 'Email is already registered' });
        }
        throw error;
      }
    }),
  );

  router.post(
    '/login',
    asyncHandler(async (req, res) => {
      if (
        !req.body ||
        typeof req.body.email !== 'string' ||
        typeof req.body.password !== 'string'
      ) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const email = normalizeEmail(req.body.email);
      const user = await database.findUserByEmail(email);

      if (!user || !(await authentication.verifyPassword(req.body.password, user.password_hash))) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      return res.json({
        token: authentication.issueToken(user),
      });
    }),
  );

  router.get(
    '/me',
    requireAuthentication,
    asyncHandler(async (req, res) => {
      const user = await database.findUserById(req.auth.user_id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json(user);
    }),
  );

  return router;
}

module.exports = {
  createRoutes,
};

