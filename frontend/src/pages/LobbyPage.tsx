import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import PlayerLobby from "../components/PlayerLobby";
import { socket } from "../socket/socket";

import type {
    Lobby,
    LobbyPlayer,
    TeamId
} from "../socket/lobby";

export default function LobbyPage() {
    const { code } = useParams<{ code: string }>();
    const navigate = useNavigate();

    const [lobby, setLobby] = useState<Lobby | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!code) return;
        let active = true;

        const updateLobby = (updatedLobby: Lobby) => {
            if (updatedLobby.code === code && active) {
                setLobby(updatedLobby);
            }
        };

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
                    if (err || !response?.success || !response.lobby) {
                        setError(response?.error ?? "Unable to load lobby.");
                        return;
                    }
                    setError("");
                    setLobby(response.lobby);
                }
            );
        }

        function onGameStarted(updatedLobby: Lobby) {
            if(updatedLobby.code !== code) return;
            navigate(`/play/${updatedLobby.code}`);
        }

        socket.on("game:started", onGameStarted);

        socket.on("game:updated", updateLobby);

        if(socket.connected) { 
            loadLobby();
        } else {
            socket.once("connect", loadLobby);
            socket.connect();
        }

        return () => {
            active=false;
            socket.off("connect", loadLobby);
            socket.off("game:updated", updateLobby);
            socket.off("game:started", onGameStarted);
        };
    }, [code]);

    const selectTeam = (teamId: TeamId) => {
        socket.emit("game:team", teamId);
    };

    if (error) return <p>{error}</p>;
    if (!lobby) return <p>Loading lobby...</p>;

    const player: LobbyPlayer | undefined =
        lobby.players.find(p => p.id === socket.id);

    if (!player) {
        return <p>You are not currently in this lobby.</p>;
    }

    const teams = [
        {
            name: "Red Team",
            id: "red",
            players: lobby.players.filter(p => p.team === "red")
        },
        {
            name: "Blue Team",
            id: "blue",
            players: lobby.players.filter(p => p.team === "blue")
        }
    ];

    return (
        <PlayerLobby
            sessionCode={lobby.code}
            player={player}
            teams={teams}
            onSelectTeam={selectTeam}
        />
    );
}
