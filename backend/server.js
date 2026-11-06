const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();
const {Server} = require("socket.io");
const http = require("http");

const apiRouter = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const registerLobbySockets = require('./sockets/lobbySocket');

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  }
});

registerLobbySockets(io);


// Connect to Database
const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/TestDB';

mongoose
  .connect(url)
  .then(() => console.log('MongoDB connected successfully via Mongoose'))
  .catch((err) => console.error('MongoDB connection error:', err));

// API routes
app.use('/api', apiRouter);

// Serve the compiled React frontend
const frontendPath = path.join(__dirname, '../frontend/dist');

app.use(express.static(frontendPath));

// Send index.html for frontend routes
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }

  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.use(notFound);
app.use(errorHandler);

// Start server
if (require.main === module) {
  const PORT = process.env.PORT || 5001;

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
