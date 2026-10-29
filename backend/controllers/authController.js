const { User } = require('../models');
const { createToken } = require('../middleware/auth');

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { login, password } = req.body || {};

    if (!login || !password) {
      return res.status(400).json({ error: 'login and password are required' });
    }

    // String() matters: without it, a body like {"login": {"$ne": null}}
    // becomes a MongoDB operator instead of a username.
    // The password field is hidden by default (select: false), so ask for it.
    const user = await User.findOne({ login: String(login) }).select('+password');

    // Same message whether the login or the password was wrong, so the
    // response doesn't reveal which usernames exist.
    if (!user || !(await user.checkPassword(String(password)))) {
      return res.status(401).json({ error: 'Invalid login or password' });
    }

    res.status(200).json({ token: createToken(user), user });
  } catch (err) {
    next(err);
  }
};
