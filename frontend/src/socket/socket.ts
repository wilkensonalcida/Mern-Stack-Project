import { io } from "socket.io-client";

export const socket = io({
  autoConnect: true,
});

socket.on("connect", () => {
  console.log("Socket.IO connected:", socket.id);
});

socket.on("connect_error", (error) => {
  console.error("Socket.IO connection error:", error.message);
});
