// Settings for signing and checking login tokens (JSON Web Tokens).
//
// JWT_SECRET signs every token. Anyone who knows it can create a valid
// token for any user, so in production it must be a long random value
// kept out of Git (in .env or the server's environment).
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET is not set. Add it to your .env file (see .env.example).'
  );
}

module.exports = {
  JWT_SECRET,
  // How long a login lasts before the user has to log in again
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h'
};
