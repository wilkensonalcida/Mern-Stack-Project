const { randomInt } = require("node:crypto");

const sessions = new Map();

function generateCode() {
  let code;

  do {
    code = randomInt(0, 36 ** 6)
      .toString(36)
      .toUpperCase()
      .padStart(6, "0");
  } while (sessions.has(code));

  return code;
}

function createGame(hostId) {
  const code = generateCode();

  const game = {
    code,
    hostId,
    status: "waiting",
    players: [hostId],
    stage: 0,
    enemyHealth: 100,
  };

  sessions.set(code, game);

  return game;
}

function joinGame(code, playerId) {
  const game = sessions.get(code);

  if (!game) {
    throw new Error("Game not found");
  }

  if (game.status !== "waiting") {
    throw new Error("Game already started");
  }

  if (!game.players.includes(playerId)) {
    game.players.push(playerId);
  }

  return game;
}

function getGame(code) {
  return sessions.get(code);
}

module.exports = {
  createGame,
  joinGame,
  getGame,
};