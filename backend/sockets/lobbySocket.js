const { createMatchService } = require('../services/matches');

function registerLobbySockets(io) {
  const pending = new Map();
  const service = createMatchService({ onChange: ({ match }) => pending.set(match.code, match) });
  // Combine bursts of taps into at most ten broadcasts per second per match.
  const broadcasts = setInterval(() => {
    for (const [code, match] of pending) io.to(code).emit('game:updated', match);
    pending.clear();
  }, 100);
  let ticking = false;
  const clock = setInterval(async () => {
    if (ticking) return;
    ticking = true;
    try { await service.tick(); }
    catch { console.error('Match clock could not save progress; it will retry.'); }
    finally { ticking = false; }
  }, 250);
  broadcasts.unref(); clock.unref();

  io.on('connection', socket => {
    let inFlight = false;
    let windowAt = Date.now(), requests = 0;
    function handle(event, operation) {
      socket.on(event, async (data, callback) => {
        if (typeof callback !== 'function') return;
        if (Date.now() - windowAt > 1000) { windowAt = Date.now(); requests = 0; }
        if (++requests > 25 || inFlight) return callback({ success: false, error: 'Please wait before retrying.' });
        inFlight = true;
        try {
          const result = await operation(data || {});
          callback({ success: true, ...result });
        } catch (error) {
          callback({ success: false, error: error.status ? error.message : 'Unable to save match. Please retry.' });
          if (!error.status) console.error('Match operation failed:', error.name);
        } finally { inFlight = false; }
      });
    }
    async function attach(result, actor) {
      if (socket.data.matchCode) await socket.leave(socket.data.matchCode);
      await socket.join(result.match.code);
      socket.data.matchCode = result.match.code;
      socket.data.actor = actor;
      return result;
    }
    handle('game:create', async data => attach(await service.create({ token: data.token }, data.requestId), { token: data.token }));
    handle('game:join', async data => attach(await service.join(data.code, data), { guestToken: data.guestToken }));
    handle('game:resume', async data => {
      const actor = data.guestToken ? { guestToken: data.guestToken } : { token: data.token };
      return attach(await service.get(data.code, actor), actor);
    });
    for (const [event, method, argument] of [
      ['game:team', 'team', d => d.team], ['game:start', 'start'],
      ['game:tap', 'tap', d => d], ['game:vote', 'vote', d => d], ['game:end', 'end'],
    ]) handle(event, data => {
      if (!socket.data.matchCode) throw Object.assign(new Error('Reconnect to the match first.'), { status: 401 });
      if (data.code !== socket.data.matchCode) throw Object.assign(new Error('Wrong match. Reconnect first.'), { status: 409 });
      return service[method](socket.data.matchCode, socket.data.actor, argument?.(data));
    });
    // Disconnect keeps the roster and durable identity; reconnect resumes it.
  });
  return { service, close() { clearInterval(clock); clearInterval(broadcasts); pending.clear(); } };
}
module.exports = registerLobbySockets;
