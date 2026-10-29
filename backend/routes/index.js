const express = require('express');

const router = express.Router();

// GET /api/ping - Health check
router.get('/ping', (req, res) => {
  res.status(200).json({ message: 'Hello World from MERN Group 60!!!' });
});

router.use('/auth', require('./auth'));
router.use('/users', require('./users'));

module.exports = router;
