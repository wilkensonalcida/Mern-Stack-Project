const { User } = require('../models');
const { createToken } = require('../middleware/auth');

// POST /api/users
exports.createUser = async (req, res, next) => {
  try {
    const { firstName = '', lastName = '', login, password, email = '' } = req.body || {};

    if (!login || !password) {
      return res.status(400).json({ error: 'login and password are required' });
    }

    if (await User.exists({ login: String(login) })) {
      return res.status(409).json({ error: 'A user with that login already exists' });
    }

    // role is intentionally not read from the request body: letting clients
    // choose their own role would let anyone register as an admin.
    // The password is hashed by the User model before it is saved.
    const user = await User.create({
      firstName: String(firstName),
      lastName: String(lastName),
      login: String(login),
      password: String(password),
      email: String(email),
      role: 'user'
    });

    // A new user is logged in right away, so the response includes a token.
    res
      .status(201)
      .location(`/api/users/${user._id}`)
      .json({ token: createToken(user), user });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/:userId
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};
