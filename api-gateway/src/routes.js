const express = require('express');
const { authenticate } = require('./jwt');
const { createProxyHandler } = require('./proxy');

function createRoutes() {
  const router = express.Router();

  router.post(
    '/api/auth/register',
    createProxyHandler('AUTH_SERVICE_URL', () => '/register'),
  );
  router.post(
    '/api/auth/login',
    createProxyHandler('AUTH_SERVICE_URL', () => '/login'),
  );
  router.get(
    '/api/auth/me',
    authenticate,
    createProxyHandler('AUTH_SERVICE_URL', () => '/me'),
  );

  router.get(
    '/api/products',
    createProxyHandler('PRODUCT_SERVICE_URL', () => '/products'),
  );
  router.get(
    '/api/products/:id',
    createProxyHandler(
      'PRODUCT_SERVICE_URL',
      (req) => `/products/${encodeURIComponent(req.params.id)}`,
    ),
  );

  router.get(
    '/api/cart',
    authenticate,
    createProxyHandler('CART_SERVICE_URL', () => '/cart'),
  );
  router.post(
    '/api/cart/items',
    authenticate,
    createProxyHandler('CART_SERVICE_URL', () => '/cart/items'),
  );
  router.delete(
    '/api/cart/items/:productId',
    authenticate,
    createProxyHandler(
      'CART_SERVICE_URL',
      (req) => `/cart/items/${encodeURIComponent(req.params.productId)}`,
    ),
  );

  router.post(
    '/api/orders/checkout',
    authenticate,
    createProxyHandler('ORDER_SERVICE_URL', () => '/checkout'),
  );
  router.get(
    '/api/orders',
    authenticate,
    createProxyHandler('ORDER_SERVICE_URL', () => '/orders'),
  );
  router.get(
    '/api/orders/:id',
    authenticate,
    createProxyHandler(
      'ORDER_SERVICE_URL',
      (req) => `/orders/${encodeURIComponent(req.params.id)}`,
    ),
  );

  return router;
}

module.exports = {
  createRoutes,
};

