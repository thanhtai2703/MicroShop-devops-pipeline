const express = require('express');
const { createRoutes } = require('./routes');

const REQUIRED_CONFIGURATION = [
  'JWT_SECRET',
  'AUTH_SERVICE_URL',
  'PRODUCT_SERVICE_URL',
  'CART_SERVICE_URL',
  'ORDER_SERVICE_URL',
];

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));

  // Client-supplied identity is never forwarded. Protected routes receive a
  // fresh identity only after JWT verification.
  app.use((req, res, next) => {
    delete req.headers['x-user-id'];
    next();
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  app.use(createRoutes());

  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

function validateConfiguration() {
  const missing = REQUIRED_CONFIGURATION.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing configuration: ${missing.join(', ')}`);
  }
}

function start() {
  validateConfiguration();

  const port = Number(process.env.PORT) || 8000;
  return createApp().listen(port, () => {
    console.log(`api-gateway listening on port ${port}`);
  });
}

if (require.main === module) {
  try {
    start();
  } catch (error) {
    console.error('Failed to start api-gateway', error);
    process.exit(1);
  }
}

module.exports = {
  createApp,
  start,
};

