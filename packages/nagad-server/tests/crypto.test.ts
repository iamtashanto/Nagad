import nodeCrypto from "node:crypto";
import { describe, it, expect } from "vitest";
import { NodeCryptoProvider } from "../src/crypto/node-provider.js";
import { PureJsCryptoProvider } from "../src/crypto/purejs-provider.js";
import {
  NagadCryptoError,
  NagadCryptoCapabilityError,
} from "../src/errors/crypto-error.js";
import { generateSimulatorKeys } from "nagad-simulator";

// node:crypto on OpenSSL 3.0 builds (Node 18/20) refuses RSA PKCS#1 v1.5 private-key decryption.
const nodeCanDecryptPkcs1 = (() => {
  try {
    const { publicKey, privateKey } = nodeCrypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const enc = nodeCrypto.publicEncrypt(
      { key: publicKey, padding: nodeCrypto.constants.RSA_PKCS1_PADDING },
      Buffer.from("x"),
    );
    nodeCrypto.privateDecrypt(
      { key: privateKey, padding: nodeCrypto.constants.RSA_PKCS1_PADDING },
      enc,
    );
    return true;
  } catch {
    return false;
  }
})();

describe("CryptoProvider & PKCS#1 v1.5 Tests", () => {
  const keys = generateSimulatorKeys();
  const provider = new NodeCryptoProvider();

  it.skipIf(!nodeCanDecryptPkcs1)(
    "runs checkCapability successfully on host runtime",
    async () => {
      await expect(provider.checkCapability()).resolves.toBeUndefined();
    },
  );

  it.skipIf(!nodeCanDecryptPkcs1)(
    "performs end-to-end RSA-PKCS1 round-trip encryption and decryption",
    async () => {
      const plaintext = JSON.stringify({
        orderId: "ORD12345678",
        amount: "500.00",
        challenge: "random-challenge-xyz",
      });

      const encrypted = await provider.encryptWithPublicKey(
        plaintext,
        keys.pg.publicKey,
      );
      expect(typeof encrypted).toBe("string");
      expect(encrypted.length).toBeGreaterThan(50);

      const decrypted = await provider.decryptWithPrivateKey(
        encrypted,
        keys.pg.privateKey,
      );
      expect(decrypted).toBe(plaintext);
    },
  );

  it("signs and verifies with RSA-SHA256", async () => {
    const payload = "sensitive-merchant-payload-2026";
    const signature = await provider.signWithPrivateKey(
      payload,
      keys.merchant.privateKey,
      "SHA256",
    );

    const isValid = await provider.verifyWithPublicKey(
      payload,
      signature,
      keys.merchant.publicKey,
      "SHA256",
    );
    expect(isValid).toBe(true);

    const isTampered = await provider.verifyWithPublicKey(
      payload + "-tampered",
      signature,
      keys.merchant.publicKey,
      "SHA256",
    );
    expect(isTampered).toBe(false);
  });

  it("signs and verifies with RSA-SHA1 (legacy fallback)", async () => {
    const payload = "legacy-sha1-test-string";
    const signature = await provider.signWithPrivateKey(
      payload,
      keys.merchant.privateKey,
      "SHA1",
    );

    const isValid = await provider.verifyWithPublicKey(
      payload,
      signature,
      keys.merchant.publicKey,
      "SHA1",
    );
    expect(isValid).toBe(true);
  });

  it("fails decryption with a single uniform error and never leaks details", async () => {
    const invalidCiphertext = Buffer.from(
      "corrupt-non-pkcs-data-string",
    ).toString("base64");
    const invalidKey = "invalid-pem-key";

    await expect(
      provider.decryptWithPrivateKey(invalidCiphertext, invalidKey),
    ).rejects.toThrow(NagadCryptoError);

    try {
      await provider.decryptWithPrivateKey(invalidCiphertext, invalidKey);
    } catch (err) {
      expect(err).toBeInstanceOf(NagadCryptoError);
      // Guarantee uniform error string
      expect((err as Error).message).toBe("Failed to decrypt sensitive data");
    }
  });

  it("PureJsCryptoProvider enforces uniform decryption error guarantee", async () => {
    const failingEngine = {
      encryptWithPublicKey: async () => "enc",
      decryptWithPrivateKey: async () => {
        throw new Error("Internal padding timing detail or corrupt byte 0x02");
      },
      signWithPrivateKey: async () => "sig",
      verifyWithPublicKey: async () => true,
      checkCapability: async () => {},
    };

    const pureProvider = new PureJsCryptoProvider(failingEngine);
    await expect(
      pureProvider.decryptWithPrivateKey("any", "key"),
    ).rejects.toThrow("Failed to decrypt sensitive data");
  });
});
