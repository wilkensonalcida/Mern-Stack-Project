import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import PageLayout from "../components/PageLayout";
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
    const [cancelled, setCancelled] = useState(false);

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

        // The host cancelled the lobby, or left it.
        function onCancelled() {
            if (active) setCancelled(true);
        }

        socket.on("game:started", onGameStarted);
        socket.on("game:cancelled", onCancelled);

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
            socket.off("game:cancelled", onCancelled);
        };
    }, [code]);

    const selectTeam = (teamId: TeamId) => {
        socket.emit("game:team", teamId);
    };

    if (cancelled) {
        return (
            <PageLayout>
                <section className="card"><div className="card-body p-4 text-center">
                    <h1 className="h3">The host closed the lobby</h1>
                    <Link className="btn btn-dark mt-2" to="/join">Join another game</Link>
                </div></section>
            </PageLayout>
        );
    }
    if (error) return <PageLayout><p role="alert" className="text-danger">{error}</p></PageLayout>;
    if (!lobby) return <PageLayout><p role="status">Loading lobby...</p></PageLayout>;

    const player: LobbyPlayer | undefined =
        lobby.players.find(p => p.id === socket.id);

    if (!player) {
        return (
            <PageLayout>
                <section className="card"><div className="card-body p-4 text-center">
                    <h1 className="h3">You're not in this lobby</h1>
                    <Link className="btn btn-dark mt-2" to="/join">Join a game</Link>
                </div></section>
            </PageLayout>
        );
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
