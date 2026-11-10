const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  createKey: { type: String, unique: true, sparse: true, select: false },
  code: { type: String, required: true, unique: true },
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  revision: { type: Number, default: 0 },
  status: { type: String, enum: ['lobby', 'playing', 'finished'], required: true },
  deadline: { type: Number, default: null },
  // Only the match service writes this bounded, versioned game snapshot.
  state: { type: mongoose.Schema.Types.Mixed, required: true, select: false },
}, { timestamps: true, minimize: false, collection: 'matches' });
schema.index({ hostId: 1, createdAt: -1 });
schema.index({ status: 1, deadline: 1 });
module.exports = mongoose.model('Match', schema);
