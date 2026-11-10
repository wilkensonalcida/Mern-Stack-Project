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

app.use(express.json());

const server = http.createServer(app);

app.use(express.urlencoded({ extended: true }));

const io = new Server(server, {
  maxHttpBufferSize: 16 * 1024,
  cors: {
    origin: process.env.APP_BASE_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  }
});

const matches = registerLobbySockets(io);


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

// Accept requests only after the database and match indexes are available.
if (require.main === module) {
  const PORT = process.env.PORT || 5001;
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/TestDB')
    .then(() => require('./models/Match').init())
    .then(() => server.listen(PORT, process.env.HOST || '127.0.0.1', () => {
      console.log('Server running on port ' + PORT);
    }))
    .catch(() => { console.error('Database startup failed. Check MongoDB configuration.'); process.exit(1); });
  const shutdown = () => {
    matches.close();
    io.close(() => mongoose.disconnect().then(() => process.exit(0)));
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
module.exports = app;
