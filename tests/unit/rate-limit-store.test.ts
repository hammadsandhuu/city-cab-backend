import { describe, expect, it, vi } from "vitest";
import { getRateLimitStore } from "@/infrastructure/redis/rate-limit-store";

vi.mock("@/infrastructure/redis/client", () => ({
  RedisClient: {
    isConnected: vi.fn().mockReturnValue(false),
    getClient: vi.fn().mockReturnValue(null),
  },
}));

describe("rate limit store", () => {
  it("returns undefined when redis is unavailable", () => {
    expect(getRateLimitStore()).toBeUndefined();
  });
});
