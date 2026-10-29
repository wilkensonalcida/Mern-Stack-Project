const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/auth');

// Creates the token sent back after a successful login or registration.
// The token's "sub" (subject) claim holds the user's id.
exports.createToken = (user) =>
  jwt.sign({ sub: String(user._id) }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

// Protects a route: the request must carry a valid token in the header
//   Authorization: Bearer <token>
// On success, req.userId holds the id of the logged-in user.
exports.requireAuth = (req, res, next) => {
  const header = req.get('Authorization') || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch {
    // Expired, tampered with, or signed with a different secret
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// For routes under /api/users/:userId — users may only access their own data.
// Must run after requireAuth.
exports.requireSelf = (req, res, next) => {
  if (req.params.userId !== req.userId) {
    return res.status(403).json({ error: 'You can only access your own account' });
  }
  next();
};
