const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required');
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    pool.on('error', (error) => {
      console.error('Unexpected PostgreSQL pool error', error);
    });
  }

  return pool;
}

async function initDatabase() {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      email VARCHAR(320) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name VARCHAR(120) NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function createUser({ email, passwordHash, name }) {
  const result = await getPool().query(
    `
      INSERT INTO users (email, password_hash, name)
      VALUES ($1, $2, $3)
      RETURNING id, email, name, created_at
    `,
    [email, passwordHash, name],
  );

  return result.rows[0];
}

async function findUserByEmail(email) {
  const result = await getPool().query(
    `
      SELECT id, email, password_hash, name, created_at
      FROM users
      WHERE email = $1
    `,
    [email],
  );

  return result.rows[0] || null;
}

async function findUserById(id) {
  const result = await getPool().query(
    `
      SELECT id, email, name, created_at
      FROM users
      WHERE id = $1
    `,
    [id],
  );

  return result.rows[0] || null;
}

async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

module.exports = {
  closeDatabase,
  createUser,
  findUserByEmail,
  findUserById,
  initDatabase,
};

