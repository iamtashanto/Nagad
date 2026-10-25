import { describe, it, expect, beforeEach } from "vitest";
import {
  GenericKvSessionStore,
  type KeyValueStore,
} from "../src/session/kv-store.js";
import { UpstashRestSessionStore } from "../src/session/upstash-store.js";
import { NagadDuplicateOrderIdError } from "../src/errors/index.js";
import type { PaymentSession } from "../src/types.js";

describe("Generic KV & Upstash REST Session Stores", () => {
  const sampleSession: PaymentSession = {
    orderId: "KV_ORDER_001",
    paymentReferenceId: "PAY_KV_001",
    amount: "350.00",
    currency: "050",
    status: "redirected",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  describe("GenericKvSessionStore", () => {
    let store: GenericKvSessionStore;
    let map: Map<string, string>;

    beforeEach(() => {
      map = new Map<string, string>();
      const mockKv: KeyValueStore = {
        async get(key: string) {
          return map.get(key) || null;
        },
        async set(key: string, value: string) {
          map.set(key, value);
        },
        async delete(key: string) {
          map.delete(key);
        },
      };

      store = new GenericKvSessionStore({ kv: mockKv });
    });

    it("creates session and prevents duplicate orderId", async () => {
      await store.createSession(sampleSession, 900);

      const session = await store.getSession("PAY_KV_001");
      expect(session?.orderId).toBe("KV_ORDER_001");

      await expect(
        store.createSession(
          {
            ...sampleSession,
            paymentReferenceId: "PAY_KV_002",
          },
          900,
        ),
      ).rejects.toThrow(NagadDuplicateOrderIdError);
    });

    it("handles atomic lease claim and release", async () => {
      await store.createSession(sampleSession, 900);

      const claimed = await store.claimSession("PAY_KV_001", 30_000);
      expect(claimed).toBe(true);

      const inFlight = await store.getSession("PAY_KV_001");
      expect(inFlight?.status).toBe("verifying");

      const secondClaim = await store.claimSession("PAY_KV_001", 30_000);
      expect(secondClaim).toBe(false);

      await store.releaseClaim("PAY_KV_001");
      const released = await store.getSession("PAY_KV_001");
      expect(released?.status).toBe("redirected");
    });

    it("transitions to fulfilled with markFulfilled", async () => {
      await store.createSession(sampleSession, 900);
      await store.markFulfilled("KV_ORDER_001");

      const fulfilled = await store.getSession("PAY_KV_001");
      expect(fulfilled?.status).toBe("fulfilled");
    });
  });

  describe("UpstashRestSessionStore", () => {
    it("executes REST commands over fetch", async () => {
      const mockStorage = new Map<string, any>();

      // Mock global fetch for Upstash REST endpoint
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (_input, init) => {
        const command = JSON.parse(init?.body as string) as (string | number)[];
        const [op, key, val] = command;

        if (op === "EXISTS") {
          return new Response(
            JSON.stringify({ result: mockStorage.has(String(key)) ? 1 : 0 }),
          );
        }
        if (op === "SET") {
          mockStorage.set(String(key), val);
          return new Response(JSON.stringify({ result: "OK" }));
        }
        if (op === "GET") {
          return new Response(
            JSON.stringify({ result: mockStorage.get(String(key)) || null }),
          );
        }
        return new Response(JSON.stringify({ result: null }));
      };

      try {
        const upstash = new UpstashRestSessionStore({
          url: "https://test-upstash.com",
          token: "test-token",
        });

        await upstash.createSession(sampleSession, 900);
        const session = await upstash.getSession("PAY_KV_001");
        expect(session?.orderId).toBe("KV_ORDER_001");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
