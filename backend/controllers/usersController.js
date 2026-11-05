const User = require('../models/User');
const { issueVerification } = require('../services/emailVerification');

exports.createUser = async (req, res, next) => {
  try {
    const {
      firstName = '',
      lastName = '',
      login,
      password,
      email
    } = req.body || {};

    if (
      [firstName, lastName, login, password, email].some(
        value => typeof value !== 'string'
      )
    ) {
      return res.status(400).json({
        error: 'Names, login, password, and email must be strings'
      });
    }

    const normalizedLogin = login.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedLogin || !password || !normalizedEmail) {
      return res.status(400).json({
        error: 'Login, password, and email are required'
      });
    }

    if (Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({
        error: 'Password must not exceed 72 UTF-8 bytes'
      });
    }

    if (await User.exists({ login: normalizedLogin })) {
      return res.status(409).json({
        error: 'A user with that login already exists'
      });
    }

    if (await User.exists({ email: normalizedEmail })) {
      return res.status(409).json({
        error: 'A user with that email already exists'
      });
    }

    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      login: normalizedLogin,
      password,
      email: normalizedEmail,
      role: 'user',
      emailVerified: false
    });

    const delivery = await issueVerification(user._id);

    res.status(201)
      .location(`/api/users/${user._id}`)
      .json({
        message: 'User registered successfully',
        emailVerification: { delivery, message: delivery === 'sent' ? 'Check your inbox to verify your email.' : 'Your account was created, but email delivery is unavailable. Request another verification email later.' },
        user
      });
  } catch (err) {
    next(err);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};
