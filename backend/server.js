const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const apiRouter = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to Database
const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/TestDB';
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully via Mongoose'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.use('/api', apiRouter);
app.use(notFound);
app.use(errorHandler);

// Test Endpoint
// app.get('/api/ping', (req, res) => {
//   res.status(200).json({ message: 'Game API is running!' });
// });

if (require.main === module) {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
module.exports = app;