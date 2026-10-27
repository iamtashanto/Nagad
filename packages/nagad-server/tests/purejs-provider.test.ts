import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "node:crypto";
import { createNagad, PureJsCryptoProvider } from "../src/index.js";
import {
  generateSimulatorKeys,
  createNagadSimulator,
  NagadSimulator,
} from "nagad-simulator";

// Runs on every supported Node version, including 18 and 20 where OpenSSL 3.0 rejects
// RSA PKCS#1 v1.5 private-key decryption in node:crypto.
describe("PureJsCryptoProvider (works without OpenSSL PKCS#1 v1.5 decryption)", () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  const provider = new PureJsCryptoProvider();

  it("decrypts what the public key encrypted, for several lengths", async () => {
    for (const text of [
      "a",
      "nagad",
      "x".repeat(100),
      "é".repeat(60),
      "y".repeat(200),
    ]) {
      const enc = await provider.encryptWithPublicKey(text, publicKey);
      expect(await provider.decryptWithPrivateKey(enc, privateKey)).toBe(text);
    }
  });

  it("accepts a PKCS#1 (RSA PRIVATE KEY) PEM too", async () => {
    const pk1 = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "pkcs1", format: "pem" },
      privateKeyEncoding: { type: "pkcs1", format: "pem" },
    });
    const enc = await provider.encryptWithPublicKey("hello", pk1.publicKey);
    expect(await provider.decryptWithPrivateKey(enc, pk1.privateKey)).toBe(
      "hello",
    );
  });

  it("reports one uniform error for tampered or malformed ciphertext", async () => {
    const enc = Buffer.from(
      await provider.encryptWithPublicKey("secret", publicKey),
      "base64",
    );
    enc[10] ^= 0xff;
    await expect(
      provider.decryptWithPrivateKey(enc.toString("base64"), privateKey),
    ).rejects.toThrow("Failed to decrypt sensitive data");
    await expect(
      provider.decryptWithPrivateKey("AAAA", privateKey),
    ).rejects.toThrow("Failed to decrypt sensitive data");
  });

  it("signs and verifies with SHA-256 and SHA-1", async () => {
    for (const alg of ["SHA256", "SHA1"] as const) {
      const sig = await provider.signWithPrivateKey("data", privateKey, alg);
      expect(
        await provider.verifyWithPublicKey("data", sig, publicKey, alg),
      ).toBe(true);
      expect(
        await provider.verifyWithPublicKey("other", sig, publicKey, alg),
      ).toBe(false);
    }
  });

  it("passes its capability check", async () => {
    await expect(provider.checkCapability()).resolves.toBeUndefined();
  });

  describe("full checkout against the simulator", () => {
    let simulator: NagadSimulator;
    let simUrl = "";
    const keys = generateSimulatorKeys();
    beforeAll(async () => {
      simulator = createNagadSimulator(keys);
      simUrl = (await simulator.start(0)).url;
    });
    afterAll(async () => {
      await simulator.stop();
    });

    it("creates and verifies a payment using only the pure-JS provider", async () => {
      const nagad = createNagad({
        merchantId: "MERC12345678901",
        merchantPrivateKey: keys.merchant.privateKey,
        pgPublicKey: keys.pg.publicKey,
        baseUrl: simUrl,
        cryptoProvider: new PureJsCryptoProvider(),
      });
      await nagad.init();
      const created = await nagad.checkout.create({
        amount: "200.00",
        callbackUrl: "https://shop.example/cb",
      });
      const result = await nagad.checkout.verify({
        paymentRefId: created.paymentReferenceId,
        expectedAmount: "200.00",
      });
      expect(result.success).toBe(true);
    });
  });
});
