const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const authorization = req.get('authorization');
  if (!authorization) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const [scheme, token, extra] = authorization.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== 'bearer' || !token || extra) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });
    const userId = Number(payload.user_id);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    req.auth = {
      user_id: userId,
      email: payload.email,
    };
    return next();
  } catch {
    return res.status(401).json({ error: 'Authentication required' });
  }
}

module.exports = {
  authenticate,
};

