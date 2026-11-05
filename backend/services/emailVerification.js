const { randomBytes, createHash } = require('node:crypto');
const User = require('../models/User');
const mail = require('./email');

exports.hashToken = token => createHash('sha256').update(token).digest('hex');

exports.issueVerification = async userId => {
  const token = randomBytes(32).toString('hex');
  const tokenHash = exports.hashToken(token);
  const now = new Date();
  const user = await User.findOneAndUpdate({
    _id: userId,
    emailVerified: { $ne: true },
    $or: [
      { emailVerificationRequestedAt: { $exists: false } },
      { emailVerificationRequestedAt: { $lte: new Date(now.getTime() - 60000) } }
    ]
  }, { $set: {
    emailVerificationTokenHash: tokenHash,
    emailVerificationExpiresAt: new Date(now.getTime() + 30 * 60 * 1000),
    emailVerificationRequestedAt: now
  } }, { returnDocument: 'after' });
  if (!user) return 'skipped';
  try {
    await mail.sendVerificationEmail(user.email, token);
    return 'sent';
  } catch {
    await User.updateOne({ _id: userId, emailVerificationTokenHash: tokenHash }, {
      $unset: { emailVerificationTokenHash: '', emailVerificationExpiresAt: '', emailVerificationRequestedAt: '' }
    });
    console.warn('Verification email delivery unavailable. Check Resend configuration, verified sender and provider status.');
    return 'unavailable';
  }
};
