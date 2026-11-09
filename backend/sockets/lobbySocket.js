const { randomInt } = require("node:crypto");
const { createEnemyGameManager } = require("./enemyGame");

const lobbies = new Map();
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode() {
  let code;

  do {
    code = Array.from(
      { length: 6 },
      () => alphabet[randomInt(alphabet.length)]
    ).join("");
  } while (lobbies.has(code));

  return code;
}

function publicLobby(lobby) {
  return {
    code: lobby.code,
    hostId: lobby.hostId,
    status: lobby.status,
    players: lobby.players,
  };
}

function registerLobbySockets(io) {
  const enemyGame = createEnemyGameManager(io, lobbies);
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    enemyGame.register(socket);

    // CREATE LOBBY
    socket.on("game:create", (data, callback) => {
      if (typeof callback !== "function") return;

      if (socket.data.lobbyCode) {
        callback({
          success: false,
          error: "Already in a lobby",
        });
        return;
      }

      const name = String(data?.name || "").trim().slice(0, 40);

      if (!name) {
        callback({
          success: false,
          error: "Player name required",
        });
        return;
      }

      const code = generateCode();

      const lobby = {
        code,
        hostId: socket.id,
        status: "waiting",
        players: [
          {
            id: socket.id,
            name,
            team: null,
          },
        ],
      };

      lobbies.set(code, lobby);
      socket.join(code);
      socket.data.lobbyCode = code;

      callback({
        success: true,
        lobby: publicLobby(lobby),
      });

      console.log("Created lobby:", code);
    });

    // JOIN LOBBY
    socket.on("game:join", (data, callback) => {
      if (typeof callback !== "function") return;

      const code = String(data?.code || "")
        .trim()
        .toUpperCase();

      const name = String(data?.name || "")
        .trim()
        .slice(0, 40);

      const lobby = lobbies.get(code);

      if (!lobby) {
        return callback({
          success: false,
          error: "Lobby not found",
        });
      }

      if (lobby.status !== "waiting") {
        return callback({
          success: false,
          error: "Game already started",
        });
      }

      if (!name) {
        return callback({
          success: false,
          error: "Player name required",
        });
      }

      if (
        socket.data.lobbyCode &&
        socket.data.lobbyCode !== code
      ) {
        return callback({
          success: false,
          error: "Already in another lobby",
        });
      }

      if (!lobby.players.some(p => p.id === socket.id)) {
        lobby.players.push({
          id: socket.id,
          name,
          team: null,
        });
      }

      socket.join(code);
      socket.data.lobbyCode = code;

      callback({
        success: true,
        lobby: publicLobby(lobby),
      });

      io.to(code).emit("game:updated", publicLobby(lobby));
    });

    // GET CURRENT LOBBY
    socket.on("game:get", (code, callback) => {
      if (typeof callback !== "function") return;

      const lobby = lobbies.get(
        String(code || "").toUpperCase()
      );

      if (!lobby) {
        return callback({
          success: false,
          error: "Lobby not found",
        });
      }

      if (!lobby.players.some(p => p.id === socket.id)) {
        return callback({
          success: false,
          error: "Not a member of this lobby",
        });
      }

      callback({
        success: true,
        lobby: publicLobby(lobby),
      });
    });

    // SELECT TEAM
    socket.on("game:team", (team, callback) => {
      const reply = (result) => {
        if (typeof callback === "function") {
          callback(result);
        }
      };

      const code = socket.data.lobbyCode;
      const lobby = lobbies.get(code);

      if (!lobby) {
        return reply({
          success: false,
          error: "Lobby not found."
        });
      }

      if (lobby.status !== "waiting") {
        return reply({
          success: false,
          error: "Game has already started."
        });
      }

      if (team !== "red" && team !== "blue" && team !== null) {
        return reply({
          success: false,
          error: "Invalid team."
        });
      }

      const player = lobby.players.find(
        p => p.id === socket.id
      );

      if (!player) {
        return reply({
          success: false,
          error: "Player not found in lobby."
        });
      }

      player.team = team;

      io.to(code).emit("game:updated", publicLobby(lobby));

      reply({ success: true });

      console.log(
        `[TEAM] ${player.name} selected ${team} in ${code}`
      );
    });

    // START GAME
    socket.on("game:start", (code, callback) => {
      if (typeof callback !== "function") return;

      const sessionCode = String(code || "").trim().toUpperCase();

      const lobby = lobbies.get(sessionCode);

      if (!lobby || lobby.hostId !== socket.id) {
        return callback({
          success: false,
          error: "Only the host can start the game",
        });
      }

      if (lobby.status !== "waiting") {
        return callback({
          success: false,
          error: "Game already started",
        });
      }

      const unassignedPlayers = lobby.players.filter(
        player => player.team !== "red" && player.team !== "blue"
      );

      if (unassignedPlayers.length > 0) {
        return callback({
          success: false,
          error: "All players must select a team",
        });
      }

      const redPlayers = lobby.players.filter(
        player => player.team === "red"
      );

      const bluePlayers = lobby.players.filter(
        player => player.team === "blue"
      );

      if (redPlayers.length === 0 || bluePlayers.length === 0) {
        return callback({
          success: false,
          error: "Both teams must have at least one player",
        });
      }

      try{
        enemyGame.begin(lobby);
      } catch (error) {
        return callback({
          success: false,
          error: "Failed to start the game",
        });
      }

      lobby.status = "playing";

      callback({ success: true });

      io.to(code).emit("game:started", publicLobby(lobby));
    });

    // CANCEL GAME
    socket.on("game:cancel", (code) => {
      const lobby = lobbies.get(code);

      if (!lobby || lobby.hostId !== socket.id) return;

      io.to(code).emit("game:cancelled");
      io.in(code).socketsLeave(code);

      for (const player of lobby.players) {
        const member = io.sockets.sockets.get(player.id);
        if (member) delete member.data.lobbyCode;
      }

      lobbies.delete(code);
    });

    // DISCONNECT
    socket.on("disconnect", () => {
      const code = socket.data.lobbyCode;
      const lobby = lobbies.get(code);

      if (!lobby) return;

      if (lobby.hostId === socket.id) {
        io.to(code).emit("game:cancelled");
        lobbies.delete(code);
      } else {
        lobby.players = lobby.players.filter(
          p => p.id !== socket.id
        );

        io.to(code).emit(
          "game:updated",
          publicLobby(lobby)
        );
      }
    });
  });
}

module.exports = registerLobbySockets;