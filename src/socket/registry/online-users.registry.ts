/**
 * In-memory online user tracking (single instance).
 * Uses Redis adapter when REDIS_ENABLED=true (multi-instance Socket.IO).
 */
class OnlineUsersRegistry {
  private readonly userSockets = new Map<string, Set<string>>();
  private readonly socketUsers = new Map<string, string>();

  register(userId: string, socketId: string): void {
    const sockets = this.userSockets.get(userId) ?? new Set<string>();
    sockets.add(socketId);
    this.userSockets.set(userId, sockets);
    this.socketUsers.set(socketId, userId);
  }

  unregister(socketId: string): void {
    const userId = this.socketUsers.get(socketId);
    if (!userId) {
      return;
    }

    this.socketUsers.delete(socketId);

    const sockets = this.userSockets.get(userId);
    if (!sockets) {
      return;
    }

    sockets.delete(socketId);
    if (sockets.size === 0) {
      this.userSockets.delete(userId);
    }
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  getOnlineUserCount(): number {
    return this.userSockets.size;
  }

  getConnectionCount(): number {
    return this.socketUsers.size;
  }

  getOnlineUserIds(): string[] {
    return [...this.userSockets.keys()];
  }

  clear(): void {
    this.userSockets.clear();
    this.socketUsers.clear();
  }
}

export const onlineUsersRegistry = new OnlineUsersRegistry();
