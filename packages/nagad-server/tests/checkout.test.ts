import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createNagad, NagadClient } from "../src/index.js";
import {
  generateSimulatorKeys,
  createNagadSimulator,
  NagadSimulator,
} from "nagad-simulator";

describe("Nagad Checkout & Verification Flow (E2E with Simulator)", () => {
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

  it("completes checkout create and verify lifecycle successfully", async () => {
    // 1. Create checkout
    const checkout = await client.checkout.create({
      amount: "500.00",
      callbackUrl: "https://merchant.example.com/callback",
    });

    expect(checkout.orderId).toBeDefined();
    expect(checkout.orderId.length).toBe(16);
    expect(checkout.paymentReferenceId).toMatch(/^PAY_/);
    expect(checkout.callBackUrl).toContain(checkout.paymentReferenceId);

    // 2. Verify payment callback
    const verifyResult = await client.checkout.verify({
      paymentRefId: checkout.paymentReferenceId,
      expectedAmount: "500.00",
      expectedOrderId: checkout.orderId,
    });

    expect(verifyResult.success).toBe(true);
    expect(verifyResult.orderId).toBe(checkout.orderId);
    expect(verifyResult.amount).toBe("500.00");
    expect(verifyResult.status).toBe("Success");
    expect(verifyResult.clientMobileNo).toBe("017****0000"); // Masked PII check

    // 3. Mark fulfilled
    await expect(
      client.checkout.markFulfilled(checkout.orderId),
    ).resolves.toBeUndefined();
  });

  it("accepts custom validated caller-supplied orderId", async () => {
    const customOrderId = "CUSTOMORDER999";

    const checkout = await client.checkout.create({
      orderId: customOrderId,
      amount: 1500, // Accepts integer 1500 -> 1500.00
      callbackUrl: "https://merchant.example.com/callback",
    });

    expect(checkout.orderId).toBe(customOrderId);

    const verifyResult = await client.checkout.verify({
      paymentRefId: checkout.paymentReferenceId,
      expectedAmount: "1500.00",
      expectedOrderId: customOrderId,
    });

    expect(verifyResult.success).toBe(true);
    expect(verifyResult.orderId).toBe(customOrderId);
    expect(verifyResult.amount).toBe("1500.00");
  });

  it("verify call is idempotent and returns cached success without second network call", async () => {
    const checkout = await client.checkout.create({
      amount: "250.00",
      callbackUrl: "https://merchant.example.com/callback",
    });

    const firstVerify = await client.checkout.verify({
      paymentRefId: checkout.paymentReferenceId,
      expectedAmount: "250.00",
    });
    expect(firstVerify.success).toBe(true);

    // Second verify should return idempotently
    const secondVerify = await client.checkout.verify({
      paymentRefId: checkout.paymentReferenceId,
      expectedAmount: "250.00",
    });
    expect(secondVerify.success).toBe(true);
    expect(secondVerify.rawResponse.idempotent).toBe(true);
  });

  it("queries payment.getStatus correctly", async () => {
    const checkout = await client.checkout.create({
      amount: "300.00",
      callbackUrl: "https://merchant.example.com/callback",
    });

    const status = await client.payment.getStatus(checkout.paymentReferenceId);
    expect(status.status).toBe("Success");
    expect(status.paymentRefId).toBe(checkout.paymentReferenceId);
  });
});
