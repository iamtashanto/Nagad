import crypto from "node:crypto";
import type { CryptoProvider } from "./provider.js";
import {
  NagadCryptoError,
  NagadCryptoCapabilityError,
} from "../errors/crypto-error.js";

export class NodeCryptoProvider implements CryptoProvider {
  private static capabilityVerified: boolean = false;

  async encryptWithPublicKey(
    plaintext: string,
    publicKeyPem: string,
  ): Promise<string> {
    try {
      const buffer = Buffer.from(plaintext, "utf-8");
      const encrypted = crypto.publicEncrypt(
        {
          key: publicKeyPem,
          padding: crypto.constants.RSA_PKCS1_PADDING,
        },
        buffer,
      );
      return encrypted.toString("base64");
    } catch (error) {
      throw new NagadCryptoError(
        `Failed to encrypt sensitive data with Nagad public key: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async decryptWithPrivateKey(
    ciphertextBase64: string,
    privateKeyPem: string,
  ): Promise<string> {
    try {
      const buffer = Buffer.from(ciphertextBase64, "base64");
      const decrypted = crypto.privateDecrypt(
        {
          key: privateKeyPem,
          padding: crypto.constants.RSA_PKCS1_PADDING,
        },
        buffer,
      );
      return decrypted.toString("utf-8");
    } catch {
      // Security rule: single uniform error for any decryption or padding failure.
      // Never leak padding validity, length errors, or timing information to callers.
      throw new NagadCryptoError("Failed to decrypt sensitive data");
    }
  }

  async signWithPrivateKey(
    data: string,
    privateKeyPem: string,
    algorithm: "SHA256" | "SHA1" = "SHA256",
  ): Promise<string> {
    try {
      const signAlg = algorithm === "SHA1" ? "RSA-SHA1" : "RSA-SHA256";
      const signer = crypto.createSign(signAlg);
      signer.update(data, "utf-8");
      signer.end();
      const signature = signer.sign(privateKeyPem);
      return signature.toString("base64");
    } catch (error) {
      throw new NagadCryptoError(
        `Failed to generate digital signature (${algorithm}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async verifyWithPublicKey(
    data: string,
    signatureBase64: string,
    publicKeyPem: string,
    algorithm: "SHA256" | "SHA1" = "SHA256",
  ): Promise<boolean> {
    try {
      const signAlg = algorithm === "SHA1" ? "RSA-SHA1" : "RSA-SHA256";
      const verifier = crypto.createVerify(signAlg);
      verifier.update(data, "utf-8");
      verifier.end();
      const signatureBuf = Buffer.from(signatureBase64, "base64");
      return verifier.verify(publicKeyPem, signatureBuf);
    } catch {
      return false;
    }
  }

  async checkCapability(): Promise<void> {
    if (NodeCryptoProvider.capabilityVerified) return;

    try {
      // Ephemeral 2048-bit test pair
      const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
      });

      const canary = Buffer.from("nagad-canary-test", "utf-8");
      const encrypted = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_PADDING,
        },
        canary,
      );

      const decrypted = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_PADDING,
        },
        encrypted,
      );

      if (decrypted.toString("utf-8") !== "nagad-canary-test") {
        throw new Error("Canary decrypted plaintext mismatch");
      }

      NodeCryptoProvider.capabilityVerified = true;
    } catch (error) {
      const detectedNode = process.version;
      const detectedOpenSsl = process.versions.openssl || "unknown";
      throw new NagadCryptoCapabilityError(
        `Host Node.js runtime (${detectedNode}, OpenSSL ${detectedOpenSsl}) failed RSA PKCS#1 v1.5 capability check (CVE-2023-46809 / OpenSSL restriction): ${error instanceof Error ? error.message : String(error)}. ` +
          `Remediation options:\n` +
          `1. Ensure your Node.js build includes OpenSSL 3 implicit rejection (recommended: Node >= 20.12.0 or >= 18.20.0).\n` +
          `2. Supply an optional PureJsCryptoProvider adapter for edge/constrained environments.\n` +
          `3. Legacy fallback: launch Node with NODE_OPTIONS="--security-revert=CVE-2023-46809" (note: timing risk).`,
      );
    }
  }
}
