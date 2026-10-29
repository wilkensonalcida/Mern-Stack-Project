const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// How much work bcrypt does per hash. Each +1 doubles the time it takes,
// which is what makes stolen hashes slow to crack. 10 is a common default.
const SALT_ROUNDS = 10;

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      default: '',
      trim: true
    },
    lastName: {
      type: String,
      default: '',
      trim: true
    },
    login: {
      type: String,
      required: [true, 'Login username is required'],
      unique: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      // Never include the password hash in query results unless a query
      // explicitly asks for it with .select('+password').
      select: false
    },
    email: {
      type: String,
      default: '',
      trim: true
    },
    role: {
      type: String,
      default: 'user',
      trim: true
    }
  },
  {
    collection: 'users',
    versionKey: false
  }
);

// Hash the password whenever it is set or changed, so a plain-text
// password is never written to the database.
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

// Compare a login attempt against the stored hash.
// Only works on a document loaded with .select('+password').
userSchema.methods.checkPassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Remove the password hash whenever a user document is sent as JSON
// (for example, the document returned by User.create()).
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
