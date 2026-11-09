import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router";

import EnemyFight from "../game/EnemyFight";
import TeamFight from "../game/TeamFight";
import PageLayout from "../components/PageLayout";

import { socket } from "../socket/socket";

import type { Lobby } from "../socket/lobby";
import type { PvpReady } from "../game/enemyTypes";

type GamePhase = "enemy" | "pvp" | "results";

export default function PlayPage() {
  const { code = "" } = useParams<{ code: string }>();

  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [gamePhase, setGamePhase] = useState<GamePhase | null>(null);
  const [pvpData, setPvpData] = useState<PvpReady | null>(null);
  const [error, setError] = useState("");

  const onPvppReady = useCallback((data: PvpReady) => {

    if (data.code !== code.toUpperCase()) return;
    setPvpData(data);
    setGamePhase("pvp");
  }, [code]);

  useEffect(() => {
    if (!code) return;
    let active = true;

    function loadLobby() {
      socket.timeout(5000).emit(
        "game:get",
        code,
        (
          err: Error | null,
          response: {
            success: boolean;
            lobby?: Lobby;
            error?: string;
          }
        ) => {
          if (!active) return;

          if (err || !response?.success || !response.lobby) {
            setError(response?.error ?? "Unable to load lobby.");
            return;
          }
          
          setLobby(response.lobby);
          setError("");
          }
      );
    }

    socket.on("connect", loadLobby);

    if (socket.connected) {
      loadLobby();
    } else {
      socket.connect();
    }

    return () => {
      active = false;
      socket.off("connect", loadLobby);
    }
  }, [code]);

  if (error) {
    return (
      <PageLayout>
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      </PageLayout>
    )
  }
  if(!code) {
    return (
      <p>Invalid game code!!!</p>
    )
  }

  if (gamePhase === "enemy") {
    return (
      <EnemyFight code={code} onPvpReady={onPvppReady} />
    )
  }

  if (gamePhase === "pvp") {
    if(!lobby || !pvpData) {
      return <p>Loading PVP data...</p>
    }
    return (
      <TeamFight lobby={lobby} pvpData={pvpData} onEndGame={() => setGamePhase("results")}/>
    )
  }
  
}