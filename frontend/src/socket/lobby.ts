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
  maxPlayers: 2 | 4;
  players: LobbyPlayer[];
}

export interface LobbyResponse {
  success: boolean;
  lobby?: Lobby;
  error?: string;
}

export interface ActionResponse {
  success: boolean;
  error?: string;
}