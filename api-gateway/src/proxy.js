const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'x-user-id',
]);

function timeoutMs() {
  const value = Number(process.env.UPSTREAM_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : 5000;
}

function copyRequestHeaders(req) {
  const headers = new Headers();

  for (const [name, rawValue] of Object.entries(req.headers)) {
    if (HOP_BY_HOP_HEADERS.has(name.toLowerCase()) || rawValue == null) {
      continue;
    }

    headers.set(name, Array.isArray(rawValue) ? rawValue.join(', ') : rawValue);
  }

  if (req.auth) {
    headers.set('X-User-Id', String(req.auth.user_id));
  }

  return headers;
}

function targetUrl(baseUrl, path, originalUrl) {
  const target = new URL(path, `${baseUrl.replace(/\/$/, '')}/`);
  const queryIndex = originalUrl.indexOf('?');
  if (queryIndex >= 0) {
    target.search = originalUrl.slice(queryIndex + 1);
  }
  return target;
}

function createProxyHandler(serviceUrlVariable, buildPath) {
  return async function proxyRequest(req, res) {
    const baseUrl = process.env[serviceUrlVariable];
    if (!baseUrl) {
      return res.status(503).json({
        error: `${serviceUrlVariable} is not configured`,
      });
    }

    const headers = copyRequestHeaders(req);
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && req.body !== undefined;
    let body;

    if (hasBody) {
      body = JSON.stringify(req.body);
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json');
      }
    }

    try {
      const upstream = await fetch(
        targetUrl(baseUrl, buildPath(req), req.originalUrl),
        {
          method: req.method,
          headers,
          body,
          redirect: 'manual',
          signal: AbortSignal.timeout(timeoutMs()),
        },
      );

      res.status(upstream.status);
      for (const [name, value] of upstream.headers.entries()) {
        if (!HOP_BY_HOP_HEADERS.has(name.toLowerCase())) {
          res.set(name, value);
        }
      }

      const responseBody = Buffer.from(await upstream.arrayBuffer());
      return responseBody.length > 0 ? res.send(responseBody) : res.end();
    } catch (error) {
      console.error(`Gateway request to ${serviceUrlVariable} failed`, error);
      return res.status(503).json({ error: 'Upstream service is unavailable' });
    }
  };
}

module.exports = {
  createProxyHandler,
};

