const { randomUUID } = require('crypto');
const express = require('express');

function shouldDeclinePayment() {
  return String(process.env.PAYMENT_FORCE_DECLINE).toLowerCase() === 'true';
}

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/charge', (req, res) => {
    const { amount, reference } = req.body || {};

    if (
      typeof amount !== 'number' ||
      !Number.isFinite(amount) ||
      amount < 0 ||
      typeof reference !== 'string' ||
      reference.trim() === ''
    ) {
      return res.status(400).json({
        error: 'A valid amount and reference are required',
      });
    }

    if (shouldDeclinePayment()) {
      return res.status(402).json({ error: 'Payment was declined' });
    }

    return res.json({
      status: 'approved',
      txn_id: `mock_${randomUUID().replaceAll('-', '')}`,
    });
  });

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

function start() {
  const port = Number(process.env.PORT) || 8000;
  const app = createApp();
  return app.listen(port, () => {
    console.log(`payment-service listening on port ${port}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = {
  createApp,
  start,
};

