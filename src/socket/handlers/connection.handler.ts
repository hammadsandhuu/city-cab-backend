import logger from "../../utils/logger";
import { onlineUsersRegistry } from "../registry/online-users.registry";
import type { AuthenticatedSocket } from "../types/socket.types";

export const handleConnection = (socket: AuthenticatedSocket): void => {
  const { userId, type, role } = socket.data;

  onlineUsersRegistry.register(userId, socket.id);

  logger.info("Socket connected", {
    socketId: socket.id,
    userId,
    type,
    role,
    onlineUsers: onlineUsersRegistry.getOnlineUserCount(),
    connections: onlineUsersRegistry.getConnectionCount(),
  });

  socket.on("disconnect", (reason) => {
    onlineUsersRegistry.unregister(socket.id);

    logger.info("Socket disconnected", {
      socketId: socket.id,
      userId,
      reason,
      onlineUsers: onlineUsersRegistry.getOnlineUserCount(),
      connections: onlineUsersRegistry.getConnectionCount(),
    });
  });
};
