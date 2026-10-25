import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  createNagad,
  NagadClient,
  NagadVerificationMismatchError,
  NagadSignatureVerificationError,
  NagadDuplicateOrderIdError,
  NagadApiError,
} from "../src/index.js";
import {
  generateSimulatorKeys,
  createNagadSimulator,
  NagadSimulator,
} from "nagad-simulator";

describe("Security, Tampering & Replay Tests", () => {
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

  it("rejects tampered amount during verification", async () => {
    const checkout = await client.checkout.create({
      amount: "500.00",
      callbackUrl: "https://merchant.example.com/callback",
    });

    // Simulator returns a modified amount (e.g. attacker paid 1.00 instead of 500.00)
    simulator.setChaos({ tamperAmount: "1.00" });

    await expect(
      client.checkout.verify({
        paymentRefId: checkout.paymentReferenceId,
        expectedAmount: "500.00",
      }),
    ).rejects.toThrow(NagadVerificationMismatchError);
  });

  it("rejects tampered orderId during verification", async () => {
    const checkout = await client.checkout.create({
      amount: "500.00",
      callbackUrl: "https://merchant.example.com/callback",
    });

    simulator.setChaos({ tamperOrderId: "DIFFERENT_ORDER_ID" });

    await expect(
      client.checkout.verify({
        paymentRefId: checkout.paymentReferenceId,
        expectedAmount: "500.00",
        expectedOrderId: checkout.orderId,
      }),
    ).rejects.toThrow(NagadVerificationMismatchError);
  });

  it("rejects tampered merchantId during verification", async () => {
    const checkout = await client.checkout.create({
      amount: "500.00",
      callbackUrl: "https://merchant.example.com/callback",
    });

    simulator.setChaos({ tamperMerchantId: "ATTACKER_MERCHANT" });

    await expect(
      client.checkout.verify({
        paymentRefId: checkout.paymentReferenceId,
        expectedAmount: "500.00",
      }),
    ).rejects.toThrow(NagadVerificationMismatchError);
  });

  it("rejects corrupt response signature during checkout initialization", async () => {
    simulator.setChaos({ invalidSignature: true });

    await expect(
      client.checkout.create({
        amount: "500.00",
        callbackUrl: "https://merchant.example.com/callback",
      }),
    ).rejects.toThrow(NagadSignatureVerificationError);
  });

  it("atomically rejects duplicate orderId before calling Nagad", async () => {
    const duplicateId = "ORDDUPLICATE01";

    await client.checkout.create({
      orderId: duplicateId,
      amount: "500.00",
      callbackUrl: "https://merchant.example.com/callback",
    });

    // Second call with same orderId must be rejected BEFORE calling Nagad
    await expect(
      client.checkout.create({
        orderId: duplicateId,
        amount: "500.00",
        callbackUrl: "https://merchant.example.com/callback",
      }),
    ).rejects.toThrow(NagadDuplicateOrderIdError);
  });

  it("maps Nagad cancellation or non-success status to NagadApiError", async () => {
    const checkout = await client.checkout.create({
      amount: "500.00",
      callbackUrl: "https://merchant.example.com/callback",
    });

    simulator.setChaos({
      simulateStatus: "Cancelled",
      simulateStatusCode: "16_0006_083",
    });

    await expect(
      client.checkout.verify({
        paymentRefId: checkout.paymentReferenceId,
        expectedAmount: "500.00",
      }),
    ).rejects.toThrow(NagadApiError);
  });
});
