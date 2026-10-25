import { describe, it, expect, beforeEach } from "vitest";
import { MemorySessionStore } from "../src/session/memory-store.js";
import {
  NagadDuplicateOrderIdError,
  NagadSessionNotFoundError,
} from "../src/errors/index.js";
import type { PaymentSession } from "../src/types.js";

describe("MemorySessionStore Atomic State & Leases", () => {
  let store: MemorySessionStore;

  const sampleSession: PaymentSession = {
    orderId: "ORDER_TEST_001",
    paymentReferenceId: "PAY_REF_001",
    amount: "120.00",
    currency: "050",
    status: "redirected",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(() => {
    store = new MemorySessionStore({ suppressDevWarning: true });
  });

  it("atomically creates session and prevents duplicate orderId", async () => {
    await store.createSession(sampleSession, 900);

    const retrieved = await store.getSession("PAY_REF_001");
    expect(retrieved?.orderId).toBe("ORDER_TEST_001");

    // Attempting to create duplicate session for same orderId must throw
    await expect(
      store.createSession(
        {
          ...sampleSession,
          paymentReferenceId: "PAY_REF_002",
        },
        900,
      ),
    ).rejects.toThrow(NagadDuplicateOrderIdError);
  });

  it("claims lease for 30s and blocks concurrent claims", async () => {
    await store.createSession(sampleSession, 900);

    const firstClaim = await store.claimSession("PAY_REF_001", 30_000);
    expect(firstClaim).toBe(true);

    const sessionInFlight = await store.getSession("PAY_REF_001");
    expect(sessionInFlight?.status).toBe("verifying");
    expect(sessionInFlight?.claimLeaseUntil).toBeGreaterThan(Date.now());

    // Concurrent claim while lease is active MUST fail
    const secondClaim = await store.claimSession("PAY_REF_001", 30_000);
    expect(secondClaim).toBe(false);
  });

  it("releases claim on transient network error, making session retriable", async () => {
    await store.createSession(sampleSession, 900);
    await store.claimSession("PAY_REF_001", 30_000);

    // Release claim
    await store.releaseClaim("PAY_REF_001");

    const released = await store.getSession("PAY_REF_001");
    expect(released?.status).toBe("redirected");
    expect(released?.claimLeaseUntil).toBeUndefined();

    // Now it can be claimed again
    const secondClaim = await store.claimSession("PAY_REF_001", 30_000);
    expect(secondClaim).toBe(true);
  });

  it("allows reclamation if lease expires", async () => {
    await store.createSession(sampleSession, 900);

    // Claim with 1ms lease
    await store.claimSession("PAY_REF_001", 1);

    // Wait 10ms for lease to expire
    await new Promise((r) => setTimeout(r, 10));

    // Can claim again because lease expired
    const expiredClaim = await store.claimSession("PAY_REF_001", 30_000);
    expect(expiredClaim).toBe(true);
  });

  it("transitions through verified -> fulfilled with markFulfilled()", async () => {
    await store.createSession(sampleSession, 900);
    await store.updateSessionStatus("PAY_REF_001", "verified");

    await store.markFulfilled("ORDER_TEST_001");

    const fulfilled = await store.getSession("PAY_REF_001");
    expect(fulfilled?.status).toBe("fulfilled");
    expect(fulfilled?.fulfilledAt).toBeDefined();
  });

  it("finds stale sessions stuck in verifying or verified", async () => {
    await store.createSession(sampleSession, 900);
    await store.claimSession("PAY_REF_001", 1);

    await new Promise((r) => setTimeout(r, 10));

    const stale = await store.findStaleSessions(100);
    expect(stale.length).toBe(1);
    expect(stale[0].paymentReferenceId).toBe("PAY_REF_001");
  });
});
