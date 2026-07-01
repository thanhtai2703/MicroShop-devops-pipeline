const {
  DependencyUnavailable,
  PaymentDeclined,
} = require('./errors');

function timeoutMs() {
  const value = Number(process.env.UPSTREAM_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : 5000;
}

function serviceUrl() {
  const url = process.env.PAYMENT_SERVICE_URL;
  if (!url) {
    throw new DependencyUnavailable('PAYMENT_SERVICE_URL is required');
  }
  return url.replace(/\/$/, '');
}

async function responseError(response, fallback) {
  try {
    const body = await response.json();
    return typeof body.error === 'string' ? body.error : fallback;
  } catch {
    return fallback;
  }
}

async function charge({ amount, reference }) {
  let response;
  try {
    response = await fetch(`${serviceUrl()}/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, reference }),
      signal: AbortSignal.timeout(timeoutMs()),
    });
  } catch (error) {
    throw new DependencyUnavailable('Payment service is unavailable');
  }

  if (response.status === 402) {
    throw new PaymentDeclined(
      await responseError(response, 'Payment was declined'),
    );
  }
  if (!response.ok) {
    throw new DependencyUnavailable('Payment service is unavailable');
  }

  let payment;
  try {
    payment = await response.json();
  } catch (error) {
    throw new DependencyUnavailable(
      'Payment service returned an invalid response',
    );
  }

  if (payment.status !== 'approved' || !payment.txn_id) {
    throw new PaymentDeclined();
  }

  return payment;
}

module.exports = {
  charge,
};

