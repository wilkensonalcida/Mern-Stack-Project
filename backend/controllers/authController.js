const User = require('../models/User');
const { createToken } = require('../middleware/auth');

exports.login = async (req, res, next) => {
  try {
    const { login, password } = req.body || {};

    if (
      typeof login !== 'string' ||
      typeof password !== 'string' ||
      !login.trim() ||
      !password
    ) {
      return res.status(400).json({
        error: 'Login and password are required as strings'
      });
    }

    if (Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({
        error: 'Password must not exceed 72 UTF-8 bytes'
      });
    }

    const user = await User.findOne({ login: login.trim() })
      .select('+password');

    if (!user || !(await user.checkPassword(password))) {
      return res.status(401).json({
        error: 'Invalid login or password'
      });
    }

    if (user.emailVerified !== true) {
      return res.status(403).json({
        error: 'Verify your email before logging in'
      });
    }

    res.status(200).json({
      token: createToken(user),
      user
    });
  } catch (err) {
    next(err);
  }
};
