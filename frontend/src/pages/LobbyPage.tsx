import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import PhoneMessage from "../components/PhoneMessage";
import PlayerLobby from "../components/PlayerLobby";
import { useWakeLock } from "../game/useWakeLock";
import { socket } from "../socket/socket";

import type {
    Lobby,
    LobbyPlayer,
    LobbyResponse,
    TeamId
} from "../socket/lobby";

export default function LobbyPage() {
    const { code } = useParams<{ code: string }>();
    const navigate = useNavigate();
    // The key the join page was given, which takes this phone's seat back if it drops.
    const location = useLocation();
    const rejoinKey = useRef((location.state as { rejoinKey?: string } | null)?.rejoinKey);

    const [lobby, setLobby] = useState<Lobby | null>(null);
    const [error, setError] = useState("");
    const [cancelled, setCancelled] = useState(false);
    const [connected, setConnected] = useState(socket.connected);
    // The connection this phone is in the lobby under. A phone that reconnects comes back as a new one.
    const [myId, setMyId] = useState(socket.id);
    const [rejoining, setRejoining] = useState(false);
    // Why a dropped phone couldn't rejoin: the game started without it, or the join failed.
    const [dropped, setDropped] = useState<"started" | "failed" | null>(null);
    // The nickname and team this phone last had in the lobby, so a dropped phone can rejoin as itself.
    const me = useRef<{ name: string; team: TeamId | null } | null>(null);
    const mounted = useRef(true);

    // The lobby is the longest wait, and a phone that sleeps drops out of it.
    useWakeLock();

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    useEffect(() => {
        const mine = lobby?.players.find(p => p.id === myId);
        if (mine) me.current = { name: mine.name, team: mine.team };
    }, [lobby, myId]);

    // A phone that reconnects comes back as a new connection, so it joins again with its rejoin key,
    // which takes its old seat back. If the server already let the old one go, the phone joins
    // under its nickname and picks its team again.
    function rejoin() {
        const saved = me.current;
        if (!code || !saved) return;
        setRejoining(true);
        setDropped(null);
        socket.timeout(5000).emit("game:join", { code, name: saved.name, rejoinKey: rejoinKey.current }, (err: Error | null, response: LobbyResponse) => {
            if (!mounted.current) return;
            setRejoining(false);
            if (err || !response?.success || !response.lobby) {
                if (response?.error === "Game already started") setDropped("started");
                else if (response?.error === "Lobby not found") setCancelled(true);
                else setDropped("failed");
                return;
            }
            rejoinKey.current = response.rejoinKey ?? rejoinKey.current;
            setMyId(socket.id);
            setLobby(response.lobby);
            const seat = response.lobby.players.find(p => p.id === socket.id);
            if (saved.team && !seat?.team) socket.emit("game:team", saved.team);
        });
    }

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
                (err: Error | null, response: LobbyResponse) => {
                    if (!active) return;
                    if (err || !response?.success || !response.lobby) {
                        setError(response?.error ?? "Unable to load lobby.");
                        return;
                    }
                    setError("");
                    setMyId(socket.id);
                    setLobby(response.lobby);
                }
            );
        }

        function onConnect() {
            setConnected(true);
            // A phone that was in the lobby comes back as a new connection, which the lobby doesn't know.
            if (me.current) rejoin();
            else loadLobby();
        }

        function onDisconnect() {
            setConnected(false);
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
        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);

        if (socket.connected) loadLobby();
        else socket.connect();

        return () => {
            active=false;
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
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
            <PhoneMessage
                title="The host closed the lobby"
                action={<Link className="phone-button" to="/join">Join another game</Link>}
            />
        );
    }
    if (dropped === "started") {
        return (
            <PhoneMessage
                title="The game started without you"
                action={<Link className="phone-button" to="/join">Join another game</Link>}
            >
                Your phone lost its connection before the start. Watch the big screen, and join the next game.
            </PhoneMessage>
        );
    }
    if (dropped === "failed") {
        return (
            <PhoneMessage
                title="You dropped out of the lobby"
                live="alert"
                action={
                    <button className="phone-button" type="button" onClick={rejoin} disabled={!connected || rejoining}>
                        {rejoining ? "Rejoining…" : `Rejoin as ${me.current?.name ?? "yourself"}`}
                    </button>
                }
            >
                Your phone lost its connection, and rejoining didn't work.
            </PhoneMessage>
        );
    }
    if (error) {
        return (
            <PhoneMessage
                title={error}
                live="alert"
                action={<Link className="phone-button" to="/join">Join a game</Link>}
            />
        );
    }
    if (!lobby) return <PhoneMessage title="Loading the lobby…" live="status" />;

    const player: LobbyPlayer | undefined =
        lobby.players.find(p => p.id === myId);

    if (!player) {
        return (
            <PhoneMessage
                title="You're not in this lobby"
                action={<Link className="phone-button" to="/join">Join a game</Link>}
            />
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
            player={player}
            teams={teams}
            onSelectTeam={selectTeam}
            offline={!connected || rejoining}
        />
    );
}
