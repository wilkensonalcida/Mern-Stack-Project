const express = require('express');
const auth = require('../controllers/authController');
const verification = require('../controllers/emailVerificationController');

const router = express.Router();

// POST /api/auth/login - Verify credentials
// Logging in is an action rather than a resource, so this is the one
// deliberate, conventional exception to noun-only REST URLs.
router.post('/login', auth.login);
router.post('/verify-email', verification.verifyEmail);
router.post('/resend-verification', verification.resendVerification);

module.exports = router;
