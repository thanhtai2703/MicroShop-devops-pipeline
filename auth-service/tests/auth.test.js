const request = require('supertest');
const { createApp } = require('../src');

function createFakeDatabase() {
  let nextId = 1;
  const users = [];

  return {
    async createUser({ email, passwordHash, name }) {
      if (users.some((user) => user.email === email)) {
        const error = new Error('duplicate email');
        error.code = '23505';
        throw error;
      }

      const user = {
        id: nextId++,
        email,
        password_hash: passwordHash,
        name,
        created_at: '2026-07-01T10:00:00.000Z',
      };
      users.push(user);

      const { password_hash, ...publicUser } = user;
      return publicUser;
    },

    async findUserByEmail(email) {
      return users.find((user) => user.email === email) || null;
    },

    async findUserById(id) {
      const user = users.find((candidate) => candidate.id === id);
      if (!user) {
        return null;
      }

      const { password_hash, ...publicUser } = user;
      return publicUser;
    },

    getUsers() {
      return users;
    },
  };
}

describe('auth-service', () => {
  let app;
  let database;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-only-secret';
    process.env.JWT_EXPIRES_IN = '1h';
  });

  beforeEach(() => {
    database = createFakeDatabase();
    app = createApp({ database });
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_EXPIRES_IN;
  });

  async function register(overrides = {}) {
    return request(app)
      .post('/register')
      .send({
        email: 'Alex@Example.com',
        password: 'pw',
        name: 'Alex',
        ...overrides,
      });
  }

  test('reports healthy', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  test('registers a normalized user with a hashed password', async () => {
    const response = await register();

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: 1,
      email: 'alex@example.com',
      name: 'Alex',
    });
    expect(response.body).not.toHaveProperty('password_hash');
    expect(database.getUsers()[0].password_hash).not.toBe('pw');
  });

  test('rejects duplicate registration', async () => {
    await register();
    const response = await register({ email: 'alex@example.com' });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'Email is already registered' });
  });

  test('rejects invalid registration input', async () => {
    const response = await register({ email: 'not-an-email' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  test('logs in and returns the current user with a valid JWT', async () => {
    await register();

    const login = await request(app).post('/login').send({
      email: 'ALEX@example.com',
      password: 'pw',
    });

    expect(login.status).toBe(200);
    expect(login.body.token).toEqual(expect.any(String));

    const profile = await request(app)
      .get('/me')
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(profile.status).toBe(200);
    expect(profile.body).toMatchObject({
      id: 1,
      email: 'alex@example.com',
      name: 'Alex',
    });
    expect(profile.body).not.toHaveProperty('password_hash');
  });

  test('rejects incorrect login credentials', async () => {
    await register();

    const response = await request(app).post('/login').send({
      email: 'alex@example.com',
      password: 'wrong',
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid email or password' });
  });

  test('rejects missing and invalid authentication', async () => {
    const missing = await request(app).get('/me');
    const invalid = await request(app)
      .get('/me')
      .set('Authorization', 'Bearer invalid-token');

    expect(missing.status).toBe(401);
    expect(invalid.status).toBe(401);
  });

  test('accepts the future gateway trusted identity header', async () => {
    await register();

    const response = await request(app).get('/me').set('X-User-Id', '1');

    expect(response.status).toBe(200);
    expect(response.body.email).toBe('alex@example.com');
  });
});

