import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PlayerLobby from "../components/PlayerLobby";
import { socket } from "../socket/socket";

import type {
    Lobby,
    LobbyPlayer,
    TeamId
} from "../socket/lobby";

export default function LobbyPage() {
    const { code } = useParams<{ code: string }>();

    const [lobby, setLobby] = useState<Lobby | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!code) return;

        const updateLobby = (updatedLobby: Lobby) => {
            setLobby(updatedLobby);
        };

        socket.on("game:updated", updateLobby);

        socket.timeout(5000).emit(
            "game:get",
            { code },
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

                setLobby(response.lobby);
            }
        );

        return () => {
            socket.off("game:updated", updateLobby);
        };
    }, [code]);

    const selectTeam = (teamId: TeamId) => {
        socket.emit("game:selectTeam", {
            code,
            teamId
        });
    };

    if (error) return <p>{error}</p>;
    if (!lobby) return <p>Loading lobby...</p>;

    const player: LobbyPlayer | undefined =
        lobby.players.find(p => p.id === socket.id);

    if (!player) {
        return <p>You are not currently in this lobby.</p>;
    }

    return (
        <PlayerLobby
            sessionCode={lobby.code}
            player={player}
            teams={lobby.teams}
            onSelectTeam={selectTeam}
        />
    );
}