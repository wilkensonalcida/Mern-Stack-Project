export type TeamId = "red" | "blue";

export interface LobbyPlayer {
  id: string;
  name: string;
  team: TeamId | null;
}

export interface Lobby {
  code: string;
  hostId: string;
  status: "waiting" | "playing";
  players: LobbyPlayer[];
}

export interface LobbyResponse {
  success: boolean;
  lobby?: Lobby;
  error?: string;
  // game:join gives each phone a key of its own, which takes its seat back if it drops and rejoins.
  rejoinKey?: string;
}

export interface ActionResponse {
  success: boolean;
  error?: string;
}