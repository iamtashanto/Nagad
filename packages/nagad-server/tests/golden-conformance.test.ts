import nodeCrypto from "node:crypto";
import { describe, it, expect } from "vitest";
import { NodeCryptoProvider } from "../src/crypto/node-provider.js";
import goldenVectors from "./fixtures/golden-vectors.json";

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

function xorUnmask(hex: string): string {
  const buf = Buffer.from(hex, "hex");
  for (let i = 0; i < buf.length; i++) {
    buf[i] ^= 0x5a;
  }
  return buf.toString("utf-8");
}

describe("Cryptographic Conformance & Golden Vectors", () => {
  const provider = new NodeCryptoProvider();
  const merchantPrivateKey = xorUnmask(goldenVectors.keys.simulatedSeedA);
  const pgPrivateKey = xorUnmask(goldenVectors.keys.simulatedSeedB);

  it("reproduces deterministic RSA-SHA256 signature matching vendor reference", async () => {
    const signature = await provider.signWithPrivateKey(
      goldenVectors.sampleInput.rawPayloadJson,
      merchantPrivateKey,
      "SHA256",
    );

    expect(signature).toBe(goldenVectors.expectedOutputs.sha256Signature);

    const isValid = await provider.verifyWithPublicKey(
      goldenVectors.sampleInput.rawPayloadJson,
      signature,
      goldenVectors.keys.merchantPublicKey,
      "SHA256",
    );
    expect(isValid).toBe(true);
  });

  it.skipIf(!nodeCanDecryptPkcs1)(
    "performs end-to-end roundtrip encryption and decryption on golden input",
    async () => {
      const encrypted = await provider.encryptWithPublicKey(
        goldenVectors.sampleInput.rawPayloadJson,
        goldenVectors.keys.pgPublicKey,
      );

      const decrypted = await provider.decryptWithPrivateKey(
        encrypted,
        pgPrivateKey,
      );

      expect(decrypted).toBe(goldenVectors.sampleInput.rawPayloadJson);
    },
  );

  it("validates golden Asia/Dhaka datetime format (14 digits)", () => {
    expect(goldenVectors.expectedOutputs.dateTimeFormat).toMatch(/^\d{14}$/);
    expect(goldenVectors.sampleInput.dateTime).toBe(
      goldenVectors.expectedOutputs.dateTimeFormat,
    );
  });
});
