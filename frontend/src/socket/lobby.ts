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
}