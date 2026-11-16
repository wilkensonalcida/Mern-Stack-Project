"use strict";

const { randomInt, randomUUID } = require("node:crypto");
const { createEnemyGameManager } = require("./enemyGame");
const { createPvpGameManager } = require("./pvpGame");

// Keep the ORIGINAL in-memory Socket.IO lobby architecture.
// Both combat engines must use this exact Map and the same io instance.
const lobbies = new Map();
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function normalizeCode(value) {
  return String(value ?? "").trim().toUpperCase();
}

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
    // Do not leak private, per-player randomized upgrade offers through game:get.
    // LobbyPage, HostPage and PlayPage only need id/name/team here.
    players: lobby.players.map(({ id, name, team }) => ({ id, name, team })),
  };
}

function registerLobbySockets(io) {
  const pvpGame = createPvpGameManager(io, lobbies);
  const enemyGame = createEnemyGameManager(io, lobbies, {
    // PvE calls this AFTER both teams have defeated Skeleton and both teams'
    // final item votes have closed. begin() receives each team knight's HP
    // and multipliers, then PvE emits game:pvp-ready.
    onPvpReady: (lobby, pvpData) => {
      pvpGame.begin(lobby, pvpData);
      console.info("[PVP INITIALIZED]", { code: lobby.code, knights: pvpData.knights });
    },
  });

  function reply(callback, response) {
    if (typeof callback === "function") callback(response);
  }

  // Only call when a lobby is actually being destroyed, never when one
  // participant exits an otherwise active/finished game.
  function destroyLobby(code, { notify = true } = {}) {
    const lobby = lobbies.get(code);
    if (!lobby) return;

    if (notify) io.to(code).emit("game:cancelled");
    enemyGame.stop(code);
    pvpGame.stop(code);

    // The host isn't in the player list, so clear its socket too.
    const memberIds = [lobby.hostId, ...lobby.players.map((player) => player.id)];
    for (const id of memberIds) {
      const memberSocket = io.sockets.sockets.get(id);
      if (!memberSocket) continue;
      memberSocket.leave(code);
      if (memberSocket.data.lobbyCode === code) {
        delete memberSocket.data.lobbyCode;
      }
    }

    // Also clear any room membership not covered by the current player list.
    io.in(code).socketsLeave(code);
    lobbies.delete(code);
    console.info("[LOBBY DESTROYED]", code);
  }

  // Clean up a reference to an old lobby, but never silently remove a socket
  // from a valid live lobby (the client should emit game:leave first).
  function clearStaleMembership(socket) {
    const oldCode = socket.data.lobbyCode;
    if (!oldCode) return;

    const oldLobby = lobbies.get(oldCode);
    if (oldLobby?.hostId === socket.id) return;
    if (oldLobby?.players.some((player) => player.id === socket.id)) return;

    socket.leave(oldCode);
    delete socket.data.lobbyCode;
  }

  function leaveLobby(socket, { disconnected = false } = {}) {
    const code = socket.data.lobbyCode;
    if (!code) return;

    const lobby = lobbies.get(code);
    socket.leave(code);
    delete socket.data.lobbyCode;
    if (!lobby) return;

    // The host isn't a player. When the host disconnects, or leaves a
    // WAITING lobby, cancel it for everyone and stop both engines. When the
    // host leaves a game that has started, such as from the results, the
    // players keep their screens, and the lobby goes when the last one leaves.
    if (lobby.hostId === socket.id) {
      if (disconnected || lobby.status === "waiting") destroyLobby(code);
      return;
    }

    const wasMember = lobby.players.some((player) => player.id === socket.id);
    if (!wasMember) return;

    // On the results screen, an explicit game:leave must not delete the
    // match while other players are still reading results.
    lobby.players = lobby.players.filter((player) => player.id !== socket.id);
    // A waiting lobby still has its host, whose code and QR code must keep working,
    // so it stays open with no players. A game goes with its last player, and a host
    // still on its page is told, so the big screen doesn't freeze on a game nobody is in.
    if (lobby.players.length === 0 && lobby.status !== "waiting") {
      const hostWatching = io.sockets.sockets.get(lobby.hostId)?.data.lobbyCode === code;
      destroyLobby(code, { notify: hostWatching });
      return;
    }

    io.to(code).emit("game:updated", publicLobby(lobby));
    console.info("[LOBBY LEFT]", { code, socketId: socket.id });
  }

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // Register these on EVERY incoming connection, including guest players.
    enemyGame.register(socket);
    pvpGame.register(socket);

    // CREATE LOBBY: the host's screen shows the game and doesn't play, so
    // hostId alone marks the host, and players holds only the guests. Login
    // checks stay in the frontend and existing auth routes.
    socket.on("game:create", (_data, callback) => {
      if (typeof callback !== "function") return;
      clearStaleMembership(socket);

      if (socket.data.lobbyCode) {
        return reply(callback, { success: false, error: "Already in a lobby" });
      }

      const code = generateCode();
      const lobby = {
        code,
        hostId: socket.id,
        status: "waiting",
        players: [],
      };

      lobbies.set(code, lobby);
      socket.join(code);
      socket.data.lobbyCode = code;

      reply(callback, { success: true, lobby: publicLobby(lobby) });
      console.info("[LOBBY CREATED]", { code, hostId: socket.id });
    });

    // CHECK A CODE: public, so a phone asks for a nickname only once its code names a lobby that's still open.
    // It joins nothing, and its errors match game:join's.
    socket.on("game:check", (data, callback) => {
      if (typeof callback !== "function") return;
      const lobby = lobbies.get(normalizeCode(data?.code));

      if (!lobby) {
        return reply(callback, { success: false, error: "Lobby not found" });
      }
      if (lobby.status !== "waiting") {
        return reply(callback, { success: false, error: "Game already started" });
      }
      reply(callback, { success: true, code: lobby.code });
    });

    // JOIN LOBBY — remains PUBLIC: guests only need a code and nickname.
    socket.on("game:join", (data, callback) => {
      if (typeof callback !== "function") return;
      clearStaleMembership(socket);

      const code = normalizeCode(data?.code);
      const name = String(data?.name ?? "").trim().slice(0, 40);
      const lobby = lobbies.get(code);

      if (!lobby) {
        return reply(callback, { success: false, error: "Lobby not found" });
      }
      if (lobby.status !== "waiting") {
        return reply(callback, { success: false, error: "Game already started" });
      }
      if (!name) {
        return reply(callback, { success: false, error: "Player name required" });
      }
      if (socket.data.lobbyCode && socket.data.lobbyCode !== code) {
        return reply(callback, { success: false, error: "Already in another lobby" });
      }
      if (lobby.hostId === socket.id) {
        return reply(callback, { success: false, error: "The host can't join as a player" });
      }

      // A phone that drops comes back as a new connection, often before the server has noticed the
      // old one is gone. The rejoin key, which only that phone was given, takes its seat back, team
      // and all, so the lobby never lists it twice.
      let player = lobby.players.find((member) => member.id === socket.id);
      const seat = !player && typeof data?.rejoinKey === "string"
        ? lobby.players.find((member) => member.rejoinKey === data.rejoinKey)
        : undefined;
      if (seat) {
        const oldSocket = io.sockets.sockets.get(seat.id);
        if (oldSocket) {
          oldSocket.leave(code);
          if (oldSocket.data.lobbyCode === code) delete oldSocket.data.lobbyCode;
        }
        seat.id = socket.id;
        player = seat;
      } else if (!player) {
        player = { id: socket.id, name, team: null, rejoinKey: randomUUID() };
        lobby.players.push(player);
      }
      socket.join(code);
      socket.data.lobbyCode = code;

      reply(callback, { success: true, lobby: publicLobby(lobby), rejoinKey: player.rejoinKey });
      io.to(code).emit("game:updated", publicLobby(lobby));
      console.info("[LOBBY JOINED]", { code, socketId: socket.id });
    });

    // GET CURRENT LOBBY — same string-code and acknowledgement contract.
    socket.on("game:get", (code, callback) => {
      if (typeof callback !== "function") return;
      const sessionCode = normalizeCode(code);
      const lobby = lobbies.get(sessionCode);
      if (!lobby) {
        return reply(callback, { success: false, error: "Lobby not found" });
      }
      const isMember = lobby.hostId === socket.id ||
        lobby.players.some((player) => player.id === socket.id);
      if (!isMember) {
        return reply(callback, { success: false, error: "Not a member of this lobby" });
      }
      reply(callback, { success: true, lobby: publicLobby(lobby) });
    });

    // SELECT TEAM — no maxPlayers rules; PvP derives its divisor from
    // the number of living team members, not a static capacity.
    socket.on("game:team", (team, callback) => {
      const code = socket.data.lobbyCode;
      const lobby = lobbies.get(code);
      if (!lobby) {
        return reply(callback, { success: false, error: "Lobby not found." });
      }
      if (lobby.status !== "waiting") {
        return reply(callback, { success: false, error: "Game has already started." });
      }
      if (team !== "red" && team !== "blue" && team !== null) {
        return reply(callback, { success: false, error: "Invalid team." });
      }
      const player = lobby.players.find((member) => member.id === socket.id);
      if (!player) {
        return reply(callback, { success: false, error: "Player not found in lobby." });
      }

      player.team = team;
      io.to(code).emit("game:updated", publicLobby(lobby));
      reply(callback, { success: true });
      console.info("[TEAM]", { code, playerId: socket.id, team });
    });

    // PLACE A PLAYER: the host puts a guest who's still picking onto the smaller team,
    // so one idle phone can't hold up the start. The server picks the team from the lobby
    // as it is now, so quick clicks spread guests out, and a guest who picked meanwhile keeps the pick.
    socket.on("game:assign", (data, callback) => {
      const lobby = lobbies.get(normalizeCode(data?.code));
      if (!lobby || lobby.hostId !== socket.id) {
        return reply(callback, { success: false, error: "Only the host can place players." });
      }
      if (lobby.status !== "waiting") {
        return reply(callback, { success: false, error: "Game has already started." });
      }
      const player = lobby.players.find((member) => member.id === data?.playerId);
      if (!player) {
        return reply(callback, { success: false, error: "Player not found in lobby." });
      }
      if (player.team) {
        return reply(callback, { success: true, team: player.team });
      }

      const size = (team) => lobby.players.filter((member) => member.team === team).length;
      player.team = size("red") <= size("blue") ? "red" : "blue";
      io.to(lobby.code).emit("game:updated", publicLobby(lobby));
      reply(callback, { success: true, team: player.team });
      console.info("[TEAM PLACED]", { code: lobby.code, playerId: player.id, team: player.team });
    });

    // START GAME — unchanged frontend contract. Initialize PvE first;
    // later PvE calls the onPvpReady callback above to start PvP.
    // The team checks cover only the guests, since the host isn't in players.
    socket.on("game:start", (code, callback) => {
      if (typeof callback !== "function") return;
      const sessionCode = normalizeCode(code);
      const lobby = lobbies.get(sessionCode);

      if (!lobby || lobby.hostId !== socket.id) {
        return reply(callback, { success: false, error: "Only the host can start the game" });
      }
      if (lobby.status !== "waiting") {
        return reply(callback, { success: false, error: "Game already started" });
      }
      const unassignedPlayers = lobby.players.filter(
        (player) => player.team !== "red" && player.team !== "blue"
      );
      if (unassignedPlayers.length > 0) {
        return reply(callback, { success: false, error: "All players must select a team" });
      }
      const redPlayers = lobby.players.filter((player) => player.team === "red");
      const bluePlayers = lobby.players.filter((player) => player.team === "blue");
      if (redPlayers.length === 0 || bluePlayers.length === 0) {
        return reply(callback, { success: false, error: "Both teams must have at least one player" });
      }

      try {
        enemyGame.begin(lobby);
      } catch (error) {
        console.error("[GAME START FAILED]", sessionCode, error);
        enemyGame.stop(sessionCode);
        return reply(callback, { success: false, error: "Failed to start the game" });
      }

      lobby.status = "playing";
      reply(callback, { success: true });
      io.to(sessionCode).emit("game:started", publicLobby(lobby));
      console.info("[GAME STARTED]", sessionCode);
    });

    // CANCEL GAME — accepts the existing fire-and-forget event and an
    // optional acknowledgement callback; cleans up both game engines.
    socket.on("game:cancel", (code, callback) => {
      const sessionCode = normalizeCode(code);
      const lobby = lobbies.get(sessionCode);
      if (!lobby || lobby.hostId !== socket.id) {
        return reply(callback, { success: false, error: "Only the host can cancel the game" });
      }
      destroyLobby(sessionCode);
      reply(callback, { success: true });
    });


    socket.on("game:leave", (callback) => {
      leaveLobby(socket);
      reply(callback, { success: true });
    });

    socket.on("disconnect", (reason) => {
      const code = socket.data.lobbyCode;
      leaveLobby(socket, { disconnected: true });
      if (code) console.info("[SOCKET DISCONNECTED]", { code, socketId: socket.id, reason });
    });
  });
}

module.exports = registerLobbySockets;