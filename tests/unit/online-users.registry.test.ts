import { describe, expect, it, beforeEach } from "vitest";
import { onlineUsersRegistry } from "../../src/socket/registry/online-users.registry";

describe("onlineUsersRegistry", () => {
  beforeEach(() => {
    onlineUsersRegistry.clear();
  });

  it("tracks user connections", () => {
    onlineUsersRegistry.register("user-1", "socket-a");
    onlineUsersRegistry.register("user-1", "socket-b");
    onlineUsersRegistry.register("user-2", "socket-c");

    expect(onlineUsersRegistry.getOnlineUserCount()).toBe(2);
    expect(onlineUsersRegistry.getConnectionCount()).toBe(3);
    expect(onlineUsersRegistry.isUserOnline("user-1")).toBe(true);
  });

  it("removes socket on unregister and clears user when last socket leaves", () => {
    onlineUsersRegistry.register("user-1", "socket-a");
    onlineUsersRegistry.register("user-1", "socket-b");

    onlineUsersRegistry.unregister("socket-a");
    expect(onlineUsersRegistry.isUserOnline("user-1")).toBe(true);
    expect(onlineUsersRegistry.getConnectionCount()).toBe(1);

    onlineUsersRegistry.unregister("socket-b");
    expect(onlineUsersRegistry.isUserOnline("user-1")).toBe(false);
    expect(onlineUsersRegistry.getOnlineUserCount()).toBe(0);
  });
});
