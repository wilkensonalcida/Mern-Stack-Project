const path = require('node:path');
const mongoose = require('mongoose');
const Match = require('../models/Match');

async function setupMatchStorage(connection) {
  const db = connection.db;
  const exists = await db.listCollections({ name: 'matches' }, { nameOnly: true }).hasNext();
  if (exists) {
    const indexes = await db.collection('matches').indexes();
    if (indexes.some(index => index.expireAfterSeconds !== undefined)) {
      throw new Error('The matches collection has a TTL index. Review its retention settings before setup.');
    }
  }
  const model = connection.models.Match || connection.model('Match', Match.schema);
  await model.createCollection();
  // Add the schema's indexes. Do not use syncIndexes: it can remove other indexes.
  await model.createIndexes();
  return { database: db.databaseName, collection: 'matches', documents: await model.countDocuments(),
    indexes: (await db.collection('matches').indexes()).map(index => index.name) };
}

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required in backend/.env.');
  const connection = await mongoose.createConnection(process.env.MONGODB_URI, {
    autoCreate: false, autoIndex: false, serverSelectionTimeoutMS: 10000,
  }).asPromise();
  try { console.log(JSON.stringify(await setupMatchStorage(connection), null, 2)); }
  finally { await connection.close(); }
}

if (require.main === module) main().catch(error => {
  // Connection errors may contain credentials; do not print their full text.
  console.error('Match database setup failed:', error.name, error.code || '');
  if (error.message.startsWith('The matches collection has a TTL')) console.error(error.message);
  if (error.message.startsWith('MONGODB_URI is required')) console.error(error.message);
  process.exitCode = 1;
});
module.exports = { setupMatchStorage };
