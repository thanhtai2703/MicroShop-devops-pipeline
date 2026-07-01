const { DependencyUnavailable, HttpError } = require('./errors');

function timeoutMs() {
  const value = Number(process.env.UPSTREAM_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : 5000;
}

function serviceUrl() {
  const url = process.env.PRODUCT_SERVICE_URL;
  if (!url) {
    throw new DependencyUnavailable('PRODUCT_SERVICE_URL is required');
  }
  return url.replace(/\/$/, '');
}

async function getProduct(productId) {
  let response;
  try {
    response = await fetch(`${serviceUrl()}/products/${productId}`, {
      signal: AbortSignal.timeout(timeoutMs()),
    });
  } catch (error) {
    throw new DependencyUnavailable('Product service is unavailable');
  }

  if (response.status === 404) {
    throw new HttpError(400, `Product ${productId} no longer exists`);
  }
  if (!response.ok) {
    throw new DependencyUnavailable('Product service is unavailable');
  }

  try {
    return await response.json();
  } catch (error) {
    throw new DependencyUnavailable(
      'Product service returned an invalid response',
    );
  }
}

module.exports = {
  getProduct,
};

