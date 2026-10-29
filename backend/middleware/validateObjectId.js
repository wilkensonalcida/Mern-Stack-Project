const mongoose = require('mongoose');

// Used with router.param(): Express calls it as (req, res, next, value, name)
// for any route containing that parameter. Rejecting malformed ids here
// returns a clean 400 instead of letting Mongoose throw a CastError (500).
module.exports = (req, res, next, value, name) => {
  if (!mongoose.isValidObjectId(value)) {
    return res.status(400).json({ error: `Invalid ${name}: ${value}` });
  }
  next();
};
