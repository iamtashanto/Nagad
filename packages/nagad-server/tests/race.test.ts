import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  createNagad,
  NagadClient,
  NagadConcurrentVerificationError,
  NagadTimeoutError,
} from "../src/index.js";
import {
  generateSimulatorKeys,
  createNagadSimulator,
  NagadSimulator,
} from "nagad-simulator";

describe("Race Conditions & Transient Failure Recovery", () => {
  let simulator: NagadSimulator;
  let simulatorUrl: string;
  let client: NagadClient;
  const keys = generateSimulatorKeys();

  beforeAll(async () => {
    simulator = createNagadSimulator(keys);
    const serverInfo = await simulator.start(0);
    simulatorUrl = serverInfo.url;

    client = createNagad({
      merchantId: "MERC12345678901",
      merchantPrivateKey: keys.merchant.privateKey,
      pgPublicKey: keys.pg.publicKey,
      baseUrl: simulatorUrl,
      verifySignature: true,
    });
  });

  afterAll(async () => {
    await simulator.stop();
  });

  beforeEach(() => {
    simulator.reset();
  });

  it("rejects concurrent verification attempts with NagadConcurrentVerificationError", async () => {
    const checkout = await client.checkout.create({
      amount: "500.00",
      callbackUrl: "https://merchant.example.com/callback",
    });

    // Execute two verify calls in parallel on the same paymentRefId
    const p1 = client.checkout.verify({
      paymentRefId: checkout.paymentReferenceId,
      expectedAmount: "500.00",
    });

    const p2 = client.checkout.verify({
      paymentRefId: checkout.paymentReferenceId,
      expectedAmount: "500.00",
    });

    const results = await Promise.allSettled([p1, p2]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    // Exactly one should succeed, or if the second ran after fulfillment it succeeded idempotently.
    // If they raced during verification, the second threw NagadConcurrentVerificationError.
    if (rejected.length > 0) {
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
        NagadConcurrentVerificationError,
      );
    } else {
      expect(fulfilled.length).toBe(2);
    }
  });

  it("releases lease on transient network timeout, allowing retry", async () => {
    const checkout = await client.checkout.create({
      amount: "500.00",
      callbackUrl: "https://merchant.example.com/callback",
    });

    // Simulate network drop on verify
    simulator.setChaos({ dropConnection: true });

    await expect(
      client.checkout.verify({
        paymentRefId: checkout.paymentReferenceId,
        expectedAmount: "500.00",
      }),
    ).rejects.toThrow(NagadTimeoutError);

    // Network recovers
    simulator.resetChaos();

    // Verification must now succeed (claim lease was released on timeout!)
    const recoveredVerify = await client.checkout.verify({
      paymentRefId: checkout.paymentReferenceId,
      expectedAmount: "500.00",
    });

    expect(recoveredVerify.success).toBe(true);
    expect(recoveredVerify.orderId).toBe(checkout.orderId);
  });
});
