const express = require('express');
const users = require('../controllers/usersController');
const validateObjectId = require('../middleware/validateObjectId');
const { requireAuth, requireSelf } = require('../middleware/auth');

const router = express.Router();

// Runs before any route below that contains :userId
router.param('userId', validateObjectId);

// POST /api/users - Register a new user (open to everyone)
router.post('/', users.createUser);

// Everything below needs a logged-in user, and only their own account
// GET /api/users/:userId - Fetch one user
router.get('/:userId', requireAuth, requireSelf, users.getUser);

module.exports = router;
