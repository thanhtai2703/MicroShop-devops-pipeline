const express = require('express');
const database = require('./db');
const { createRoutes } = require('./routes');

function createApp(dependencies = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.use(createRoutes(dependencies));

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

async function start() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
  }

  await database.initDatabase();

  const port = Number(process.env.PORT) || 8000;
  const app = createApp();
  const server = app.listen(port, () => {
    console.log(`auth-service listening on port ${port}`);
  });

  async function shutdown(signal) {
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await database.closeDatabase();
      process.exit(0);
    });
  }

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Failed to start auth-service', error);
    process.exit(1);
  });
}

module.exports = {
  createApp,
  start,
};
