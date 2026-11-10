const express = require('express');
const { createMatchService } = require('../services/matches');
const router = express.Router();
const service = createMatchService();
function actor(req) {
  const header = req.get('Authorization') || '';
  return { token: header.startsWith('Bearer ') ? header.slice(7) : undefined };
}
function route(handler) {
  return async (req, res) => {
    try { res.json(await handler(req)); }
    catch (error) { res.status(error.status || 503).json({ error: error.status ? error.message : 'Match history unavailable. Please retry.' }); }
  };
}
router.get('/', route(req => service.history(actor(req), req.query.page === undefined ? 1 : Number(req.query.page))));
router.get('/:code', route(req => service.historyDetail(req.params.code, actor(req))));
module.exports = router;
