const { DependencyUnavailable } = require('./errors');

function timeoutMs() {
  const value = Number(process.env.UPSTREAM_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : 5000;
}

function serviceUrl() {
  const url = process.env.CART_SERVICE_URL;
  if (!url) {
    throw new DependencyUnavailable('CART_SERVICE_URL is required');
  }
  return url.replace(/\/$/, '');
}

async function getCart(userId) {
  let response;
  try {
    response = await fetch(`${serviceUrl()}/cart`, {
      headers: { 'X-User-Id': String(userId) },
      signal: AbortSignal.timeout(timeoutMs()),
    });
  } catch (error) {
    throw new DependencyUnavailable('Cart service is unavailable');
  }

  if (!response.ok) {
    throw new DependencyUnavailable('Cart service is unavailable');
  }

  try {
    const cart = await response.json();
    if (!Array.isArray(cart.items)) {
      throw new Error('Invalid cart response');
    }
    return cart;
  } catch (error) {
    throw new DependencyUnavailable('Cart service returned an invalid response');
  }
}

async function removeCartItem(userId, productId) {
  let response;
  try {
    response = await fetch(`${serviceUrl()}/cart/items/${productId}`, {
      method: 'DELETE',
      headers: { 'X-User-Id': String(userId) },
      signal: AbortSignal.timeout(timeoutMs()),
    });
  } catch (error) {
    throw new DependencyUnavailable('Cart service is unavailable');
  }

  if (!response.ok) {
    throw new DependencyUnavailable('Cart service could not clear the cart');
  }
}

async function clearCart(userId, items) {
  // cart-service stores the whole cart as one JSON value, so removals must be
  // sequential to avoid concurrent read-modify-write updates losing changes.
  for (const item of items) {
    await removeCartItem(userId, item.product_id);
  }
}

module.exports = {
  clearCart,
  getCart,
};
