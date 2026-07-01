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
    CREATE TABLE IF NOT EXISTS orders (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
      status VARCHAR(30) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id BIGSERIAL PRIMARY KEY,
      order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id BIGINT NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      price NUMERIC(12, 2) NOT NULL CHECK (price >= 0)
    );

    CREATE INDEX IF NOT EXISTS idx_orders_user_created
      ON orders(user_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_order_items_order
      ON order_items(order_id);
  `);
}

function formatItem(row) {
  return {
    product_id: Number(row.product_id),
    quantity: Number(row.quantity),
    price: Number(row.price),
  };
}

function formatOrder(row, items) {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    total: Number(row.total),
    status: row.status,
    created_at: row.created_at,
    items: items.map(formatItem),
  };
}

async function createPaidOrder({ userId, total, items }) {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    const orderResult = await client.query(
      `
        INSERT INTO orders (user_id, total, status)
        VALUES ($1, $2, 'paid')
        RETURNING id, user_id, total, status, created_at
      `,
      [userId, total.toFixed(2)],
    );
    const order = orderResult.rows[0];
    const savedItems = [];

    for (const item of items) {
      const itemResult = await client.query(
        `
          INSERT INTO order_items (order_id, product_id, quantity, price)
          VALUES ($1, $2, $3, $4)
          RETURNING product_id, quantity, price
        `,
        [order.id, item.product_id, item.quantity, item.price.toFixed(2)],
      );
      savedItems.push(itemResult.rows[0]);
    }

    await client.query('COMMIT');
    return formatOrder(order, savedItems);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getItemsForOrder(orderId, queryable = getPool()) {
  const result = await queryable.query(
    `
      SELECT product_id, quantity, price
      FROM order_items
      WHERE order_id = $1
      ORDER BY id
    `,
    [orderId],
  );
  return result.rows;
}

async function listOrdersByUser(userId) {
  const result = await getPool().query(
    `
      SELECT id, user_id, total, status, created_at
      FROM orders
      WHERE user_id = $1
      ORDER BY created_at DESC, id DESC
    `,
    [userId],
  );

  return Promise.all(
    result.rows.map(async (order) =>
      formatOrder(order, await getItemsForOrder(order.id)),
    ),
  );
}

async function findOrderByIdForUser(orderId, userId) {
  const result = await getPool().query(
    `
      SELECT id, user_id, total, status, created_at
      FROM orders
      WHERE id = $1 AND user_id = $2
    `,
    [orderId, userId],
  );
  const order = result.rows[0];
  if (!order) {
    return null;
  }

  return formatOrder(order, await getItemsForOrder(order.id));
}

async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

module.exports = {
  closeDatabase,
  createPaidOrder,
  findOrderByIdForUser,
  initDatabase,
  listOrdersByUser,
};

