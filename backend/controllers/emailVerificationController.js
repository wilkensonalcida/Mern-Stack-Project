const User = require('../models/User');
const { hashToken, issueVerification } = require('../services/emailVerification');
const acknowledgement = { message: 'If this email belongs to an unverified account, a verification email will be requested. Please wait at least 60 seconds before retrying.' };

exports.verifyEmail = async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    const { token } = req.body || {};
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
      return res.status(400).json({ error: 'Verification link is invalid or expired. Request a new email.' });
    }
    const user = await User.findOneAndUpdate({
      emailVerificationTokenHash: hashToken(token),
      emailVerificationExpiresAt: { $gt: new Date() },
      emailVerified: { $ne: true }
    }, {
      $set: { emailVerified: true },
      $unset: { emailVerificationTokenHash: '', emailVerificationExpiresAt: '', emailVerificationRequestedAt: '' }
    }, { returnDocument: 'after' });
    if (!user) return res.status(400).json({ error: 'Verification link is invalid or expired. Request a new email.' });
    return res.status(200).json({ message: 'Email verified successfully. You can now log in.' });
  } catch (err) { next(err); }
};

exports.resendVerification = async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    const { email } = req.body || {};
    if (typeof email !== 'string' || email.length > 254 || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }
    const user = await User.findOne({ email: email.trim().toLowerCase(), emailVerified: { $ne: true } });
    if (user) await issueVerification(user._id);
    return res.status(202).json(acknowledgement);
  } catch (err) { next(err); }
};
