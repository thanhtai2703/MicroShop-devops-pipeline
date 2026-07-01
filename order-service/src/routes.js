const { randomUUID } = require('crypto');
const express = require('express');
const cartClientModule = require('./cart_client');
const databaseModule = require('./db');
const { HttpError } = require('./errors');
const paymentClientModule = require('./payment_client');
const productClientModule = require('./product_client');

function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function requireUserId(req, res, next) {
  const userId = Number(req.get('x-user-id'));
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  req.userId = userId;
  return next();
}

function validateCartItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpError(400, 'Cart is empty');
  }

  for (const item of items) {
    if (
      !Number.isSafeInteger(item.product_id) ||
      item.product_id <= 0 ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity <= 0
    ) {
      throw new HttpError(400, 'Cart contains an invalid item');
    }
  }
}

function createRoutes({
  database = databaseModule,
  cartClient = cartClientModule,
  productClient = productClientModule,
  paymentClient = paymentClientModule,
} = {}) {
  const router = express.Router();

  router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  router.post(
    '/checkout',
    requireUserId,
    asyncHandler(async (req, res) => {
      const cart = await cartClient.getCart(req.userId);
      validateCartItems(cart.items);

      const products = await Promise.all(
        cart.items.map((item) => productClient.getProduct(item.product_id)),
      );
      let totalCents = 0;
      const orderItems = cart.items.map((cartItem, index) => {
        const product = products[index];
        const price = Number(product.price);

        if (!Number.isFinite(price) || price < 0) {
          throw new HttpError(503, 'Product service returned an invalid price');
        }
        if (!Number.isSafeInteger(product.stock) || product.stock < cartItem.quantity) {
          throw new HttpError(
            409,
            `${product.name || 'Product'} does not have enough stock`,
          );
        }

        const priceCents = Math.round(price * 100);
        totalCents += priceCents * cartItem.quantity;
        return {
          product_id: cartItem.product_id,
          quantity: cartItem.quantity,
          price: priceCents / 100,
        };
      });
      const total = totalCents / 100;

      await paymentClient.charge({
        amount: total,
        reference: `checkout-${req.userId}-${randomUUID()}`,
      });

      const order = await database.createPaidOrder({
        userId: req.userId,
        total,
        items: orderItems,
      });

      try {
        await cartClient.clearCart(req.userId, cart.items);
      } catch (error) {
        // Payment and the local order transaction already succeeded. Returning
        // the paid order is safer than encouraging the client to pay again.
        console.error('Paid order created but cart cleanup failed', error);
      }

      return res.status(201).json(order);
    }),
  );

  router.get(
    '/orders',
    requireUserId,
    asyncHandler(async (req, res) => {
      const orders = await database.listOrdersByUser(req.userId);
      return res.json({ items: orders, total: orders.length });
    }),
  );

  router.get(
    '/orders/:id',
    requireUserId,
    asyncHandler(async (req, res) => {
      const orderId = Number(req.params.id);
      if (!Number.isSafeInteger(orderId) || orderId <= 0) {
        return res.status(400).json({ error: 'Invalid order id' });
      }

      const order = await database.findOrderByIdForUser(orderId, req.userId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      return res.json(order);
    }),
  );

  return router;
}

module.exports = {
  createRoutes,
};

