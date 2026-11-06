const {
  createGame,
  joinGame,
  getGame,
} = require("../game/gameSessions");

function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log("Connected:", socket.id);

    // CREATE GAME
    socket.on("game:create", (callback) => {
      try {
        const game = createGame(socket.id);

        socket.join(game.code);

        callback({
          success: true,
          game,
        });

      } catch (error) {
        callback({
          success: false,
          error: error.message,
        });
      }
    });

    // JOIN GAME
    socket.on("game:join", (code, callback) => {
      try {
        const game = joinGame(
          String(code).toUpperCase(),
          socket.id
        );

        socket.join(game.code);

        io.to(game.code).emit(
          "game:updated",
          game
        );

        callback({
          success: true,
          game,
        });

      } catch (error) {
        callback({
          success: false,
          error: error.message,
        });
      }
    });

    // START GAME
    socket.on("game:start", (code) => {
      const game = getGame(code);

      if (!game) return;

      // Only the host can start
      if (game.hostId !== socket.id) return;
      if (game.status !== "waiting") return;

      game.status = "playing";

      io.to(code).emit(
        "game:started",
        game
      );
    });

    socket.on("disconnect", () => {
      console.log("Disconnected:", socket.id);
    });
  });
}

module.exports = registerSocketHandlers;