const authentication = require('./auth');

function unauthorized(res) {
  return res.status(401).json({ error: 'Authentication required' });
}

function createAuthMiddleware(auth = authentication) {
  return function requireAuthentication(req, res, next) {
    const authorization = req.get('authorization');

    if (authorization) {
      const [scheme, token, extra] = authorization.trim().split(/\s+/);

      if (scheme?.toLowerCase() !== 'bearer' || !token || extra) {
        return unauthorized(res);
      }

      try {
        const payload = auth.verifyToken(token);
        const userId = Number(payload.user_id);

        if (!Number.isSafeInteger(userId) || userId <= 0) {
          return unauthorized(res);
        }

        req.auth = {
          user_id: userId,
          email: payload.email,
        };
        return next();
      } catch {
        return unauthorized(res);
      }
    }

    // In later phases this header is injected by the trusted API gateway.
    const gatewayUserId = Number(req.get('x-user-id'));
    if (Number.isSafeInteger(gatewayUserId) && gatewayUserId > 0) {
      req.auth = { user_id: gatewayUserId };
      return next();
    }

    return unauthorized(res);
  };
}

module.exports = {
  createAuthMiddleware,
};

